# routers/spotify.py
"""
Spotify OAuth routes.

Expected table (Supabase/Postgres):

CREATE TABLE IF NOT EXISTS integrations (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at bigint,
  scope text,
  meta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

Env (python-backend/.env):
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...             # server-only
  SPOTIFY_CLIENT_ID=...
  SPOTIFY_CLIENT_SECRET=...
  SPOTIFY_REDIRECT_URI=http://localhost:8080/settings
"""

from __future__ import annotations

import base64
import os
import time
from datetime import datetime
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

load_dotenv()

# ---- Optional: Supabase (only used if creds exist) ----
try:
  from supabase import create_client, Client  # type: ignore
except Exception:
  create_client = None
  Client = None  # type: ignore

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Optional[Client] = None
if create_client and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
  try:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  except Exception as e:
    print("Supabase client init failed (Spotify tokens will not be saved):", e)
    supabase = None


def get_spotify_env() -> tuple[str, str, Optional[str]]:
  client_id = os.getenv("SPOTIFY_CLIENT_ID") or os.getenv("VITE_SPOTIFY_CLIENT_ID")
  client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
  redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI") or os.getenv("VITE_SPOTIFY_REDIRECT_URI")
  if not client_id or not client_secret:
    raise HTTPException(status_code=500, detail="Spotify credentials not configured on server")
  return client_id, client_secret, redirect_uri


router = APIRouter()


# ---------- Models ----------
class SpotifyTokenRequest(BaseModel):
  code: str
  user_id: str  # pass user id via OAuth 'state' on the frontend


class SpotifyTokenResponse(BaseModel):
  access_token: Optional[str] = None
  token_type: Optional[str] = None
  expires_in: Optional[int] = None
  refresh_token: Optional[str] = None
  scope: Optional[str] = None
  saved: Optional[bool] = None  # indicates DB upsert success


class RefreshRequest(BaseModel):
  user_id: str


class DisconnectRequest(BaseModel):
  user_id: str


# ---------- Helpers ----------
def build_basic_auth_header(client_id: str, client_secret: str) -> dict[str, str]:
  token = f"{client_id}:{client_secret}"
  encoded = base64.b64encode(token.encode()).decode()
  return {"Authorization": f"Basic {encoded}"}


async def spotify_post_token(data: dict, auth_header: dict[str, str]) -> dict:
  """POST to Spotify token endpoint with form-encoded data; return JSON or raise HTTPException."""
  try:
    async with httpx.AsyncClient(timeout=20.0) as client:
      resp = await client.post(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={
          **auth_header,
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      )
  except httpx.RequestError as e:
    raise HTTPException(status_code=502, detail=f"Network error to Spotify: {e!s}")

  if resp.status_code != 200:
    print("Spotify token error:", resp.status_code, resp.text)
    raise HTTPException(status_code=resp.status_code, detail=resp.text)

  return resp.json()


def parse_expires_at(value: Any) -> Optional[int]:
  """Normalize expires_at (epoch/int, digit string, or ISO string) to epoch seconds."""
  if value is None:
    return None
  if isinstance(value, (int, float)):
    return int(value)
  if isinstance(value, str):
    if value.isdigit():
      try:
        return int(value)
      except ValueError:
        return None
    try:
      iso_val = value
      if iso_val.endswith("Z"):
        iso_val = iso_val.replace("Z", "+00:00")
      dt = datetime.fromisoformat(iso_val)
      return int(dt.timestamp())
    except Exception:
      return None
  return None


def token_expired(expires_at: Any) -> bool:
  """Return True if expires_at is in the past (grace of a few seconds)."""
  ts = parse_expires_at(expires_at)
  if ts is None:
    return True
  return int(time.time()) >= (ts - 5)


def normalize_expires_for_store(value: Any) -> Any:
  """
  Convert exp values to a DB-friendly format. If it's numeric/digit string,
  store as ISO timestamp so timestamptz columns don't choke on large ints.
  """
  try:
    if value is None:
      return None
    if isinstance(value, (int, float)):
      return datetime.utcfromtimestamp(int(value)).isoformat()
    if isinstance(value, str) and value.isdigit():
      return datetime.utcfromtimestamp(int(value)).isoformat()
  except Exception:
    return value
  return value


def get_user_tokens(user_id: str, raise_if_missing: bool = True) -> dict:
  """Fetch stored tokens for user; optionally suppress 404 if missing."""
  if not supabase:
    raise HTTPException(status_code=500, detail="Supabase not configured on server")
  try:
    res = (
      supabase
      .table("integrations")
      .select("*")
      .eq("user_id", user_id)
      .eq("provider", "spotify")
      .limit(1)
      .execute()
    )
    error = getattr(res, "error", None)
    if error:
      raise HTTPException(status_code=500, detail=f"Supabase error: {error}")
    data = getattr(res, "data", None)
    if isinstance(data, list):
      if not data:
        if raise_if_missing:
          raise HTTPException(status_code=404, detail="No Spotify integration found for user")
        return {}
      return data[0]
    if isinstance(data, dict) and data:
      return data
    if raise_if_missing:
      raise HTTPException(status_code=404, detail="No Spotify integration found for user")
    return {}
  except HTTPException:
    raise
  except Exception as e:
    msg = getattr(e, "detail", None) or getattr(e, "message", None) or str(e) or repr(e)
    raise HTTPException(status_code=500, detail=f"Failed to fetch tokens: {msg}")


def upsert_tokens(user_id: str, data: dict, fallback_refresh: Optional[str] = None) -> bool:
  """Upsert Spotify tokens into the 'integrations' table for the given user."""
  if not supabase:
    raise HTTPException(status_code=500, detail="Supabase not configured on server")

  try:
    expires_in = data.get("expires_in")
    expires_at_value = data.get("expires_at")
    if not expires_at_value and isinstance(expires_in, (int, float, str)) and str(expires_in).isdigit():
      expires_at_value = int(time.time()) + int(expires_in)
    expires_at_value = normalize_expires_for_store(expires_at_value)

    payload = {
      "user_id": user_id,
      "provider": "spotify",
      "access_token": data.get("access_token"),
      "refresh_token": data.get("refresh_token") or fallback_refresh,
      "expires_at": expires_at_value,
      "scope": data.get("scope"),
      "meta": data,
    }
    res = supabase.table("integrations").upsert(
      payload,
      on_conflict="user_id,provider",
    ).execute()
    error = getattr(res, "error", None)
    if error:
      raise HTTPException(status_code=500, detail=f"Supabase upsert error: {error}")
    return True
  except HTTPException:
    raise
  except Exception as e:
    msg = getattr(e, "detail", None) or getattr(e, "message", None) or str(e)
    print("Failed to save Spotify tokens:", msg)
    raise HTTPException(status_code=500, detail=f"Failed to save Spotify tokens: {msg}")


def delete_user_tokens(user_id: str) -> bool:
  """Remove the Spotify integration row for a user."""
  if not supabase:
    raise HTTPException(status_code=500, detail="Supabase not configured on server")

  try:
    res = (
      supabase
      .table("integrations")
      .delete()
      .eq("user_id", user_id)
      .eq("provider", "spotify")
      .execute()
    )
    data: Any = getattr(res, "data", None)
    if isinstance(data, list):
      return len(data) > 0
    if isinstance(data, dict):
      return bool(data)
    return False
  except HTTPException:
    raise
  except Exception as e:
    msg = getattr(e, "message", None) or str(e)
    raise HTTPException(status_code=500, detail=f"Failed to remove Spotify connection: {msg}")


# ---------- Routes ----------
@router.post("/token", response_model=SpotifyTokenResponse)
async def exchange_token(req: SpotifyTokenRequest):
  """
  Exchange an authorization code for tokens.
  - Requires frontend to pass `user_id` (from state) to save tokens.
  """
  client_id, client_secret, redirect_uri = get_spotify_env()

  if not req.user_id:
    raise HTTPException(status_code=400, detail="user_id is required to save Spotify tokens")

  auth_header = build_basic_auth_header(client_id, client_secret)
  payload = {
    "grant_type": "authorization_code",
    "code": req.code,
  }
  if redirect_uri:
    payload["redirect_uri"] = redirect_uri

  data = await spotify_post_token(payload, auth_header)
  saved = upsert_tokens(req.user_id, data)
  return {**data, "saved": saved}


@router.post("/refresh", response_model=SpotifyTokenResponse)
async def refresh_token(body: RefreshRequest):
  """
  Refresh tokens for a user (if expired or forced).
  """
  client_id, client_secret, _ = get_spotify_env()
  row = get_user_tokens(body.user_id)

  refresh_token_value = row.get("refresh_token")
  if not refresh_token_value:
    raise HTTPException(status_code=400, detail="No refresh token stored")

  auth_header = build_basic_auth_header(client_id, client_secret)

  data = await spotify_post_token(
    {
      "grant_type": "refresh_token",
      "refresh_token": refresh_token_value,
    },
    auth_header,
  )

  # Spotify may omit refresh_token on refresh; keep existing one
  if "refresh_token" not in data:
    data["refresh_token"] = refresh_token_value

  saved = upsert_tokens(body.user_id, data, fallback_refresh=refresh_token_value)
  return {**data, "saved": saved}


@router.get("/status")
async def status(user_id: str = Query(...)):
  """
  Lightweight connection check. Returns connected: True if row exists.
  """
  if not supabase:
    return {"connected": False}

  try:
    res = (
      supabase
      .table("integrations")
      .select("user_id,provider")
      .eq("user_id", user_id)
      .eq("provider", "spotify")
      .limit(1)
      .execute()
    )
    connected = bool(res.data)
    return {"connected": connected}
  except Exception as e:
    print("Spotify status check error:", e)
    return {"connected": False}


@router.post("/disconnect")
async def disconnect(body: DisconnectRequest):
  """Delete the stored Spotify integration for the user."""
  disconnected = delete_user_tokens(body.user_id)
  return {"disconnected": disconnected}


# ---------- Data fetch helpers ----------
async def ensure_access_token(user_id: str) -> str:
  """Return a valid access token, refreshing if needed."""
  row = get_user_tokens(user_id)
  access_token = row.get("access_token")
  refresh_token_value = row.get("refresh_token")
  expires_at = row.get("expires_at")

  if not access_token or token_expired(expires_at):
    if not refresh_token_value:
      raise HTTPException(status_code=400, detail="Token expired and no refresh token available")

    client_id, client_secret, _ = get_spotify_env()
    auth_header = build_basic_auth_header(client_id, client_secret)
    data = await spotify_post_token(
      {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token_value,
      },
      auth_header,
    )

    # Keep old refresh token if Spotify omits it
    if "refresh_token" not in data:
      data["refresh_token"] = refresh_token_value

    upsert_tokens(user_id, data, fallback_refresh=refresh_token_value)
    access_token = data.get("access_token")

  if not access_token:
    raise HTTPException(status_code=400, detail="No access token available")
  return access_token


async def spotify_get(url: str, token: str, params: Optional[dict] = None) -> dict:
  try:
    async with httpx.AsyncClient(timeout=20.0) as client:
      resp = await client.get(
        url,
        params=params,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
      )
  except httpx.RequestError as e:
    raise HTTPException(status_code=502, detail=f"Network error to Spotify: {e!s}")

  if resp.status_code != 200:
    print("Spotify API error:", resp.status_code, resp.text)
    raise HTTPException(status_code=resp.status_code, detail=resp.text)
  return resp.json()


@router.get("/top")
async def top(
  user_id: str = Query(...),
  limit: int = Query(5, ge=1, le=20),
  time_range: str = Query("short_term"),
):
  """
  Get top tracks and artists (default short_term ≈ 4 weeks).
  """
  token = await ensure_access_token(user_id)
  tracks_data = await spotify_get(
    "https://api.spotify.com/v1/me/top/tracks",
    token,
    params={"time_range": time_range, "limit": limit},
  )
  artists_data = await spotify_get(
    "https://api.spotify.com/v1/me/top/artists",
    token,
    params={"time_range": time_range, "limit": limit},
  )

  # Normalize a few fields for the frontend
  tracks = [
    {
      "id": t.get("id"),
      "name": t.get("name"),
      "artists": ", ".join([a.get("name", "") for a in t.get("artists", []) if a]),
      "album": (t.get("album") or {}).get("name"),
      "image": ((t.get("album") or {}).get("images") or [{}])[0].get("url"),
      "preview_url": t.get("preview_url"),
      "url": (t.get("external_urls") or {}).get("spotify"),
    }
    for t in tracks_data.get("items", [])
  ]
  artists = [
    {
      "id": a.get("id"),
      "name": a.get("name"),
      "genres": a.get("genres", []),
      "image": (a.get("images") or [{}])[0].get("url"),
      "url": (a.get("external_urls") or {}).get("spotify"),
    }
    for a in artists_data.get("items", [])
  ]

  return {"tracks": tracks, "artists": artists}


@router.get("/recent")
async def recent(
  user_id: str = Query(...),
  limit: int = Query(10, ge=1, le=50),
):
  """
  Get recently played tracks.
  """
  token = await ensure_access_token(user_id)
  data = await spotify_get(
    "https://api.spotify.com/v1/me/player/recently-played",
    token,
    params={"limit": limit},
  )
  items = []
  for item in data.get("items", []):
    track = item.get("track") or {}
    items.append(
      {
        "id": track.get("id") or item.get("played_at"),
        "played_at": item.get("played_at"),
        "track": {
          "id": track.get("id"),
          "name": track.get("name"),
          "artists": ", ".join([a.get("name", "") for a in track.get("artists", []) if a]),
          "album": (track.get("album") or {}).get("name"),
          "image": ((track.get("album") or {}).get("images") or [{}])[0].get("url"),
          "url": (track.get("external_urls") or {}).get("spotify"),
        },
      }
    )
  return {"items": items}
