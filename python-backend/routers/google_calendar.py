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
import re

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


class CalendarSettings(BaseModel):
    only_personal_calendars: bool = True
    work_calendars: bool = False
    include_all_day_events: bool = True
    include_regular_meetings: bool = False
    include_locations: bool = False


class CalendarSettingsPayload(BaseModel):
    user_id: str
    settings: CalendarSettings


DEFAULT_CALENDAR_SETTINGS = CalendarSettings().model_dump()
WORK_KEYWORDS = [
    "meeting",
    "sync",
    "1:1",
    "one on one",
    "standup",
    "retro",
    "all-hands",
    "all hands",
    "interview",
    "client",
    "status",
    "check-in",
    "review",
    "planning",
]
SENSITIVE_PATTERNS = [
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    r"\bhttps?:\/\/\S+",
    r"\bmeet\.google\.com\/\S+",
    r"\bzoom\.us\/\S+",
    r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b",
]


def sanitize_summary_text(summary: Optional[str]) -> str:
    if not summary:
        return "Calendar event"
    cleaned = summary
    for pattern in SENSITIVE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
    noisy_words = ["sync", "1:1", "interview", "standup", "meeting", "touchpoint", "check-in"]
    tokens = [
        token for token in cleaned.split()
        if not any(noise in token.lower() for noise in noisy_words)
    ]
    cleaned_final = " ".join(tokens).strip()
    return cleaned_final or "Calendar event"


def sanitize_location_text(location: Optional[str], include: bool) -> Optional[str]:
    if not include or not location:
        return None
    coarse = re.sub(r"\d+", "", location).split(",")[0].strip()
    if not coarse:
        return None
    words = coarse.split()
    return " ".join(words[:3]) or None


def parse_calendar_date(entry: Optional[dict]) -> Optional[datetime]:
    if not entry:
        return None
    value = entry.get("dateTime") or entry.get("date")
    if not value:
        return None
    try:
        iso_val = value.replace("Z", "+00:00") if isinstance(value, str) and value.endswith("Z") else value
        return datetime.fromisoformat(iso_val)
    except Exception:
        return None


def event_duration_hours(event: dict) -> Optional[float]:
    start = parse_calendar_date(event.get("start"))
    end = parse_calendar_date(event.get("end"))
    if not start or not end:
        return None
    diff = end - start
    return diff.total_seconds() / 3600


def is_all_day_event(event: dict) -> bool:
    start = event.get("start") or {}
    end = event.get("end") or {}
    if start.get("date") or end.get("date"):
        return True
    duration = event_duration_hours(event)
    return bool(duration and duration >= 20)


def looks_like_work_event(summary: Optional[str]) -> bool:
    if not summary:
        return False
    lowered = summary.lower()
    return any(keyword in lowered for keyword in WORK_KEYWORDS)


def extract_calendar_settings(record: Optional[dict]) -> dict:
    settings = DEFAULT_CALENDAR_SETTINGS.copy()
    if not record:
        return settings
    raw = record.get("calendar_settings")
    if isinstance(raw, dict):
        for key, value in raw.items():
            if key in settings:
                settings[key] = bool(value)
    elif isinstance(raw, str):
        try:
            import json  # local import to avoid top-level dependency if unused
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                for key, value in parsed.items():
                    if key in settings:
                        settings[key] = bool(value)
        except Exception:
            pass
    meta = record.get("meta")
    if isinstance(meta, dict):
        raw_meta_settings = meta.get("calendar_settings")
        if isinstance(raw_meta_settings, dict):
            for key, value in raw_meta_settings.items():
                if key in settings:
                    settings[key] = bool(value)
    return settings


def describe_calendar_window(
    start: Optional[dict],
    end: Optional[dict],
) -> str:
    start_date = parse_calendar_date(start)
    if not start_date:
        return "Coming up soon"
    bucket = "Early" if start_date.day <= 10 else "Mid" if start_date.day <= 20 else "Late"
    month = start_date.strftime("%B")
    short_date = start_date.strftime("%b %-d") if hasattr(start_date, "strftime") else start_date.isoformat()
    try:
        short_date = start_date.strftime("%b %-d")
    except ValueError:
        short_date = start_date.strftime("%b %d")

    if start and start.get("dateTime"):
        if hasattr(start_date, "strftime"):
            try:
                time_string = start_date.strftime("%-I:%M %p")
            except ValueError:
                time_string = start_date.strftime("%I:%M %p")
        else:
            time_string = None
    else:
        time_string = None

    end_date = parse_calendar_date(end)
    spans_multiple_days = bool(
        end_date and abs((end_date - start_date).total_seconds()) > 60 * 60 * 24
    )
    if spans_multiple_days and end_date:
        try:
            end_short = end_date.strftime("%b %-d")
        except ValueError:
            end_short = end_date.strftime("%b %d")
        return f"{bucket} {month} ({short_date} – {end_short})"
    if time_string:
        return f"{bucket} {month} • {time_string}"
    return f"{bucket} {month} ({short_date})"


def should_include_event(event: dict, settings: dict) -> bool:
    summary = event.get("summary") or ""
    work_event = looks_like_work_event(summary)
    allow_work = settings.get("work_calendars", False)
    allow_personal = settings.get("only_personal_calendars", True)

    if not allow_personal and not allow_work:
        allow_personal = True

    if work_event and not allow_work:
        return False
    if not work_event and not allow_personal:
        return False

    all_day = is_all_day_event(event)
    if all_day and not settings.get("include_all_day_events", True):
        return False
    if (not all_day) and work_event and not settings.get("include_regular_meetings", False):
        return False

    return True


def build_event_descriptor(event: dict, settings: dict) -> dict:
    label = sanitize_summary_text(event.get("summary"))
    window = describe_calendar_window(event.get("start"), event.get("end"))
    location = sanitize_location_text(event.get("location"), settings.get("include_locations", False))
    bullet = f"{window}: '{label}'"
    if location:
        bullet = f"{bullet} in {location}"
    return {
        "id": event.get("id") or f"{label}-{window}",
        "label": label,
        "window": window,
        "location": location,
        "bullet": bullet,
    }


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
    if not existing:
        existing = {"user_id": user_id}
    calendar_settings = extract_calendar_settings(existing)

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
    merged_meta["calendar_settings"] = calendar_settings

    payload = {
        "user_id": user_id,
        "provider": GOOGLE_PROVIDER,
        "access_token": token_payload.get("access_token") or existing.get("access_token"),
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "scope": token_payload.get("scope") or existing.get("scope"),
        "meta": merged_meta,
        "calendar_settings": calendar_settings,
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


def persist_calendar_settings(user_id: str, new_settings: dict) -> dict:
    sb = require_supabase()
    existing = get_user_tokens(user_id, raise_if_missing=False)
    merged_settings = extract_calendar_settings(existing)
    for key, value in new_settings.items():
        if key in merged_settings:
            merged_settings[key] = bool(value)

    payload = {
        "user_id": user_id,
        "provider": GOOGLE_PROVIDER,
        "access_token": existing.get("access_token"),
        "refresh_token": existing.get("refresh_token"),
        "expires_at": existing.get("expires_at"),
        "scope": existing.get("scope"),
        "meta": {
            **(existing.get("meta") or {}),
            "calendar_settings": merged_settings,
        },
        "calendar_settings": merged_settings,
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
        raise HTTPException(status_code=500, detail=f"Failed to save calendar preferences: {exc}")
    return merged_settings


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


@router.get("/preferences")
async def google_preferences(user_id: str = Query(..., description="Supabase auth user id")):
    record = get_user_tokens(user_id, raise_if_missing=False)
    settings = extract_calendar_settings(record)
    return {"settings": settings}


@router.post("/preferences")
async def update_google_preferences(payload: CalendarSettingsPayload):
    saved = persist_calendar_settings(payload.user_id, payload.settings.model_dump())
    return {"settings": saved}


@router.get("/events")
async def google_events(
    user_id: str = Query(..., description="Supabase auth user id"),
    max_results: int = Query(10, ge=1, le=50),
    time_min: Optional[str] = Query(None),
    time_max: Optional[str] = Query(None),
):
    access_token, record = await ensure_access_token(user_id)
    settings = extract_calendar_settings(record)
    default_min, default_max = default_time_bounds()
    effective_min = time_min or default_min
    effective_max = time_max or default_max
    events = await fetch_calendar_events(access_token, max_results, effective_min, effective_max)
    items = events.get("items", []) or []
    filtered = [event for event in items if should_include_event(event, settings)]
    sanitized = [build_event_descriptor(event, settings) for event in filtered]
    bullets = [entry["bullet"] for entry in sanitized]
    return {"events": sanitized, "bullets": bullets, "settings": settings}
