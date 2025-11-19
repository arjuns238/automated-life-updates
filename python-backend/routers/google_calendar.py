# routers/google_calendar.py
"""
Google Calendar OAuth + event fetch routes.

Expected DB (integrations table) matches Strava/Spotify entries:
  provider text (use 'google_calendar')
  access_token text
  refresh_token text
  expires_at timestamptz
  scope text
  meta jsonb
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

load_dotenv()

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
        print("Supabase client init failed (Google tokens will not be saved):", e)
        supabase = None

GOOGLE_PROVIDER = "google_calendar"


def get_google_env() -> tuple[str, str, Optional[str]]:
    client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or os.getenv("VITE_GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google credentials not configured on server")
    return client_id, client_secret, redirect_uri


router = APIRouter()


class GoogleTokenRequest(BaseModel):
    code: str
    user_id: str


class GoogleTokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    scope: Optional[str] = None
    token_type: Optional[str] = None
    expires_in: Optional[int] = None
    id_token: Optional[str] = None
    saved: Optional[bool] = None


class DisconnectRequest(BaseModel):
    user_id: str


def require_supabase():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")
    return supabase


async def google_post(data: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error to Google: {exc!s}")

    if resp.status_code != 200:
        print("Google token error:", resp.status_code, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


def as_iso_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    value = dt.astimezone(timezone.utc).replace(microsecond=0)
    return value.isoformat().replace("+00:00", "Z")


def parse_expires_at(value: Any) -> Optional[int]:
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
            iso_val = value.replace("Z", "+00:00") if value.endswith("Z") else value
            dt = datetime.fromisoformat(iso_val)
            return int(dt.timestamp())
        except Exception:
            return None
    return None


def token_expired(record: dict) -> bool:
    expires_epoch = parse_expires_at(record.get("expires_at"))
    if expires_epoch is None:
        return True
    return int(datetime.now(timezone.utc).timestamp()) >= (expires_epoch - 10)


def get_user_tokens(user_id: str, raise_if_missing: bool = True) -> dict:
    sb = require_supabase()
    try:
        res = (
            sb.table("integrations")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", GOOGLE_PROVIDER)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {exc}")

    data = getattr(res, "data", None)
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict) and data:
        return data

    if raise_if_missing:
        raise HTTPException(status_code=404, detail="No Google integration found for user")
    return {}


def upsert_tokens(user_id: str, token_payload: dict) -> bool:
    sb = require_supabase()
    existing = get_user_tokens(user_id, raise_if_missing=False)

    refresh_token = token_payload.get("refresh_token") or existing.get("refresh_token")
    expires_at = token_payload.get("expires_at")
    expires_in = token_payload.get("expires_in")
    if not expires_at and expires_in:
        try:
            expires_at = as_iso_utc(datetime.utcnow() + timedelta(seconds=int(expires_in)))
        except Exception:
            expires_at = existing.get("expires_at")
    elif isinstance(expires_at, (int, float)):
        expires_at = as_iso_utc(datetime.utcfromtimestamp(int(expires_at)))
    elif isinstance(expires_at, str):
        expires_at = expires_at
    else:
        expires_at = existing.get("expires_at")

    merged_meta: dict[str, Any] = {}
    existing_meta = existing.get("meta")
    if isinstance(existing_meta, dict):
        merged_meta.update(existing_meta)
    if isinstance(token_payload, dict):
        merged_meta.update(token_payload)

    payload = {
        "user_id": user_id,
        "provider": GOOGLE_PROVIDER,
        "access_token": token_payload.get("access_token") or existing.get("access_token"),
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "scope": token_payload.get("scope") or existing.get("scope"),
        "meta": merged_meta,
    }

    try:
        res = (
            sb.table("integrations")
            .upsert(payload, on_conflict="user_id,provider")
            .execute()
        )
        error = getattr(res, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=f"Supabase upsert error: {error}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save Google tokens: {exc}")
    return True


def delete_user_tokens(user_id: str) -> bool:
    sb = require_supabase()
    try:
        res = (
            sb.table("integrations")
            .delete()
            .eq("user_id", user_id)
            .eq("provider", GOOGLE_PROVIDER)
            .execute()
        )
        error = getattr(res, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=f"Supabase delete error: {error}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete Google tokens: {exc}")
    return True


async def ensure_access_token(user_id: str) -> tuple[str, dict]:
    record = get_user_tokens(user_id)
    if not record.get("access_token"):
        raise HTTPException(status_code=400, detail="No Google access token stored")
    if not token_expired(record):
        return record["access_token"], record

    refresh_token = record.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token missing; reconnect Google Calendar")

    client_id, client_secret, _ = get_google_env()
    refreshed = await google_post(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    )
    if "refresh_token" not in refreshed:
        refreshed["refresh_token"] = refresh_token

    upsert_tokens(user_id, refreshed)
    updated = get_user_tokens(user_id)
    if not updated.get("access_token"):
        raise HTTPException(status_code=400, detail="Failed to refresh Google access token")
    return updated["access_token"], updated


def default_time_bounds() -> tuple[str, str]:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    later = now + timedelta(days=7)
    return as_iso_utc(now), as_iso_utc(later)


async def fetch_calendar_events(
    access_token: str,
    max_results: int,
    time_min: str,
    time_max: Optional[str],
) -> dict:
    params = {
        "singleEvents": "true",
        "orderBy": "startTime",
        "timeMin": time_min,
        "maxResults": str(max_results),
    }
    if time_max:
        params["timeMax"] = time_max

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error to Google Calendar: {exc!s}")

    if resp.status_code != 200:
        print("Google events error:", resp.status_code, resp.text)
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


@router.post("/token", response_model=GoogleTokenResponse)
async def exchange_google_token(payload: GoogleTokenRequest):
    client_id, client_secret, redirect_uri = get_google_env()
    token_resp = await google_post(
        {
            "code": payload.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    )
    saved = upsert_tokens(payload.user_id, token_resp)
    token_resp["saved"] = saved
    return token_resp


@router.get("/status")
async def google_status(user_id: str = Query(..., description="Supabase auth user id")):
    record = get_user_tokens(user_id, raise_if_missing=False)
    connected = bool(record.get("access_token"))
    return {"connected": connected}


@router.post("/disconnect")
async def google_disconnect(payload: DisconnectRequest):
    deleted = delete_user_tokens(payload.user_id)
    return {"disconnected": deleted}


@router.get("/events")
async def google_events(
    user_id: str = Query(..., description="Supabase auth user id"),
    max_results: int = Query(10, ge=1, le=50),
    time_min: Optional[str] = Query(None),
    time_max: Optional[str] = Query(None),
):
    access_token, _ = await ensure_access_token(user_id)
    default_min, default_max = default_time_bounds()
    effective_min = time_min or default_min
    effective_max = time_max or default_max
    events = await fetch_calendar_events(access_token, max_results, effective_min, effective_max)
    return {"events": events.get("items", []), "raw": events}
