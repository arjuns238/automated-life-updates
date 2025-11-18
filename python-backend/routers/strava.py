# routers/strava.py
"""
Strava OAuth + data fetch routes.

Expected table (Supabase/Postgres):

CREATE TABLE IF NOT EXISTS integrations (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at bigint,
  scope text,
  athlete_id bigint,
  athlete_username text,
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

Env (python-backend/.env):
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...             # server-only
  STRAVA_CLIENT_ID=176569
  STRAVA_CLIENT_SECRET=...
  STRAVA_REDIRECT_URI=http://localhost:8080/settings
"""

from __future__ import annotations

import os
import time
from datetime import datetime
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# ---- Load envs early and safely ----
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
        print("Supabase client init failed (tokens will not be saved):", e)
        supabase = None

# ---- Strava config is read at call-time to avoid import-order issues ----
def get_strava_env() -> tuple[str, str, Optional[str]]:
    client_id = os.getenv("STRAVA_CLIENT_ID") or os.getenv("VITE_STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    redirect_uri = os.getenv("STRAVA_REDIRECT_URI")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Strava credentials not configured on server")
    return client_id, client_secret, redirect_uri


router = APIRouter()


# ---------- Models ----------
class StravaTokenRequest(BaseModel):
    code: str
    user_id: str  # pass user id via OAuth 'state' on the frontend


class StravaTokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None
    expires_in: Optional[int] = None
    token_type: Optional[str] = None
    scope: Optional[str] = None
    athlete: Optional[dict] = None
    saved: Optional[bool] = None  # indicates DB upsert success


class RefreshRequest(BaseModel):
    user_id: str


class DisconnectRequest(BaseModel):
    user_id: str


# ---------- Helpers ----------
async def strava_post_token(data: dict) -> dict:
    """POST to Strava token endpoint with form-encoded data; return JSON or raise HTTPException."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://www.strava.com/oauth/token",
                data=data,
                headers={"Accept": "application/json"},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network error to Strava: {e!s}")

    if resp.status_code != 200:
        # Surface Strava's error body to help debug (invalid_grant, invalid_client, etc.)
        print("Strava token error:", resp.status_code, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


def upsert_tokens(user_id: str, data: dict) -> bool:
    """Upsert Strava tokens into the 'integrations' table for the given user."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")

    try:
        expires_at_raw = data.get("expires_at")
        expires_at_value = None
        if isinstance(expires_at_raw, (int, float)):
            try:
                expires_at_value = datetime.utcfromtimestamp(int(expires_at_raw)).isoformat()
            except Exception:
                expires_at_value = expires_at_raw
        elif isinstance(expires_at_raw, str) and expires_at_raw.isdigit():
            try:
                expires_at_value = datetime.utcfromtimestamp(int(expires_at_raw)).isoformat()
            except Exception:
                expires_at_value = expires_at_raw
        else:
            expires_at_value = expires_at_raw

        payload = {
            "user_id": user_id,
            "provider": "strava",
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
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
    except Exception as e:
        msg = getattr(e, "detail", None) or getattr(e, "message", None) or str(e)
        print("Failed to save tokens:", msg)
        raise HTTPException(status_code=500, detail=f"Failed to save Strava tokens: {msg}")


def get_user_tokens(user_id: str) -> dict:
    """Fetch stored tokens for user; raise if missing."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")
    try:
        res = (
            supabase
            .table("integrations")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", "strava")
            .limit(1)
            .execute()
        )
        error = getattr(res, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=f"Supabase error: {error}")
        data = getattr(res, "data", None)
        if isinstance(data, list):
            if not data:
                raise HTTPException(status_code=404, detail="No Strava integration found for user")
            return data[0]
        if isinstance(data, dict) and data:
            return data
        raise HTTPException(status_code=404, detail="No Strava integration found for user")
    except Exception as e:
        # If supabase throws an error object, try to surface it
        msg = getattr(e, "detail", None) or getattr(e, "message", None) or str(e) or repr(e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tokens: {msg}")


def delete_user_tokens(user_id: str) -> bool:
    """Remove the Strava integration row for a user."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")

    try:
        res = (
            supabase
            .table("integrations")
            .delete()
            .eq("user_id", user_id)
            .eq("provider", "strava")
            .execute()
        )
        # Some clients return list, others dict; coerce to bool safely
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
        raise HTTPException(status_code=500, detail=f"Failed to remove Strava connection: {msg}")


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
        # Try ISO datetime (with or without offset)
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


async def strava_get_activities(access_token: str, page: int = 1, per_page: int = 30) -> list[dict]:
    """Fetch athlete activities with the given access token."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                "https://www.strava.com/api/v3/athlete/activities",
                params={"page": page, "per_page": per_page},
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network error to Strava: {e!s}")

    if resp.status_code != 200:
        print("Strava activities error:", resp.status_code, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


# ---------- Routes ----------
@router.post("/token", response_model=StravaTokenResponse)
async def exchange_token(req: StravaTokenRequest):
    """
    Exchange an authorization code for tokens.
    - Requires frontend to pass `user_id` (from state) to save tokens.
    """
    client_id, client_secret, redirect_uri = get_strava_env()

    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id is required to save Strava tokens")

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": req.code,
        "grant_type": "authorization_code",
    }
    if redirect_uri:
        # Strava returns 400 invalid_grant if redirect_uri doesn't match what was used in auth
        payload["redirect_uri"] = redirect_uri

    data = await strava_post_token(payload)

    upsert_tokens(req.user_id, data)
    return {**data, "saved": True}


@router.post("/refresh", response_model=StravaTokenResponse)
async def refresh_token(body: RefreshRequest):
    """
    Refresh tokens for a user (if expired or forced).
    """
    client_id, client_secret, _ = get_strava_env()
    row = get_user_tokens(body.user_id)

    refresh_token_value = row.get("refresh_token")
    if not refresh_token_value:
        raise HTTPException(status_code=400, detail="No refresh token stored")

    data = await strava_post_token(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token_value,
        }
    )

    saved = upsert_tokens(body.user_id, data)
    return {**data, "saved": saved}


@router.get("/activities")
async def activities(
    user_id: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    """
    Get recent athlete activities for a connected user.
    Automatically refreshes token if expired.
    """
    # Load tokens
    row = get_user_tokens(user_id)
    access_token = row.get("access_token")
    refresh_token_value = row.get("refresh_token")
    expires_at = row.get("expires_at")

    # If expired, refresh first
    if token_expired(expires_at):
        client_id, client_secret, _ = get_strava_env()
        if not refresh_token_value:
            raise HTTPException(status_code=400, detail="Token expired and no refresh token available")

        data = await strava_post_token(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token_value,
            }
        )
        upsert_tokens(user_id, data)
        access_token = data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token available")

    # Fetch activities
    acts = await strava_get_activities(access_token, page=page, per_page=per_page)
    return {"items": acts, "page": page, "per_page": per_page}


@router.get("/status")
async def status(user_id: str = Query(...)):
    """
    Lightweight connection check. Returns connected: True if row exists.
    """
    if not supabase:
        return {"connected": False}

    try:
        res = supabase.table("integrations").select("user_id,provider").eq("user_id", user_id).eq("provider", "strava").limit(1).execute()
        connected = bool(res.data)
        return {"connected": connected}
    except Exception as e:
        print("status check error:", e)
        return {"connected": False}


@router.post("/disconnect")
async def disconnect(body: DisconnectRequest):
    """Delete the stored Strava integration for the user."""
    disconnected = delete_user_tokens(body.user_id)
    return {"disconnected": disconnected}
