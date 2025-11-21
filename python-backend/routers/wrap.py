# routers/wrap.py
"""
Deliver a single "This Month Wrapped" payload for a user.

The endpoint keeps the shape stable so we can plug in real Strava/Spotify/Calendar
integrations later. Today it pulls recent life updates from Supabase (if available),
stubs external stats, and optionally calls OpenAI to draft a warm summary.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

load_dotenv()

# Optional Supabase client (works when service role envs are present)
try:
    from supabase import Client, create_client  # type: ignore
except Exception:
    create_client = None
    Client = None  # type: ignore

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Optional[Client] = None
if create_client and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:  # pragma: no cover - best-effort init
        print("Supabase init failed for /api/wrap routes:", e)
        supabase = None

# Optional OpenAI client (kept isolated so the endpoint works even without a key)
try:
    from openai import OpenAI  # type: ignore
except Exception:
    OpenAI = None  # type: ignore

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and OpenAI else None


router = APIRouter()


# ---------- Models ----------
class CalendarHighlight(BaseModel):
    title: str
    date_label: str


class CalendarSummary(BaseModel):
    highlights: List[CalendarHighlight] = Field(default_factory=list)


class StravaSummary(BaseModel):
    total_activities: int = 0
    total_distance_km: float = 0.0
    moving_time_hours: float = 0.0


class MusicSummary(BaseModel):
    top_track: Optional[str] = None
    top_genres: List[str] = Field(default_factory=list)
    total_minutes_listened: int = 0


class LifeUpdateSnippet(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: Optional[str] = None
    snippet: Optional[str] = None


class WrapResponse(BaseModel):
    month_label: str
    ai_summary: str
    strava: StravaSummary
    music: MusicSummary
    calendar: CalendarSummary
    life_updates: List[LifeUpdateSnippet] = Field(default_factory=list)


# ---------- Helpers ----------
def current_month_range() -> tuple[datetime, datetime]:
    """Return start/end datetimes (UTC) for the current month."""
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    end = next_month - timedelta(microseconds=1)
    return start, end


def fetch_recent_life_updates(user_id: str, start: datetime, end: datetime) -> List[LifeUpdateSnippet]:
    """
    Pull the user's recent life updates for the month (best-effort).
    If Supabase credentials are missing, fall back to an empty list so the endpoint still works.
    """
    if not supabase:
        return []

    try:
        res = (
            supabase.table("life_updates")
            .select("id, title, ai_summary, user_summary, created_at")
            .eq("user_id", user_id)
            .gte("created_at", start.isoformat())
            .lte("created_at", end.isoformat())
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )
        error = getattr(res, "error", None)
        if error:
            raise HTTPException(status_code=500, detail=f"Supabase error: {error}")

        items = getattr(res, "data", None) or []
        snippets: List[LifeUpdateSnippet] = []
        for item in items:
            text = item.get("ai_summary") or item.get("user_summary") or ""
            snippet = (text[:220] + ("…" if len(text) > 220 else "")) if text else None
            snippets.append(
                LifeUpdateSnippet(
                    id=str(item.get("id")),
                    title=item.get("title"),
                    created_at=item.get("created_at"),
                    snippet=snippet,
                )
            )
        return snippets
    except HTTPException:
        raise
    except Exception as e:
        print("Failed to fetch life updates for wrap:", e)
        return []


def get_mock_strava_summary(user_id: str) -> StravaSummary:
    """
    Placeholder Strava totals for the month.
    Swap this for a real fetch that:
      1) Looks up the user's Strava tokens in the integrations table.
      2) Calls the Strava API for month-to-date stats.
      3) Normalizes values into this StravaSummary model.
    """
    # A tiny deterministic variance so different users don't all see the same numbers.
    variation = (sum(bytearray(user_id.encode("utf-8"))) % 12) / 10.0
    return StravaSummary(
        total_activities=8 + int(variation),
        total_distance_km=72.5 + variation * 3,
        moving_time_hours=6.4 + variation * 0.3,
    )


def get_mock_music_summary(user_id: str) -> MusicSummary:
    """
    Placeholder Spotify stats.
    To plug in real data, fetch the user's top tracks/artists via the Spotify router
    and map them into this structure.
    """
    sample_genres = ["dream pop", "indie electronica", "lofi beats", "nu jazz"]
    top_track = "Midnight Waves — Nova"  # stub label; replace with real track name
    return MusicSummary(
        top_track=top_track,
        top_genres=sample_genres[:3],
        total_minutes_listened=980 + (len(user_id) % 120),
    )


def get_mock_calendar_highlights() -> CalendarSummary:
    """
    Placeholder calendar highlights.
    Replace by reading the google_calendar router (or direct Google Calendar API)
    for the current month and formatting into friendly labels.
    """
    now = datetime.now()
    examples = [
        CalendarHighlight(title="Sunset hike with friends", date_label=now.replace(day=5).strftime("%b %d")),
        CalendarHighlight(title="Sprint review wrapped", date_label=now.replace(day=14).strftime("%b %d")),
        CalendarHighlight(title="Family dinner night", date_label=now.replace(day=22).strftime("%b %d")),
    ]
    return CalendarSummary(highlights=examples)


def build_prompt(
    month_label: str,
    updates: List[LifeUpdateSnippet],
    strava: StravaSummary,
    music: MusicSummary,
    calendar: CalendarSummary,
) -> str:
    update_lines = "\n".join(
        f"- {item.title or 'Update'}: {item.snippet}" for item in updates if item.snippet
    )
    genre_line = ", ".join(music.top_genres) if music.top_genres else "varied genres"
    highlights = "\n".join(f"- {h.date_label}: {h.title}" for h in calendar.highlights)

    return f"""
You are summarizing this user's month in 3–5 warm, authentic sentences. Be positive but not cheesy.
End with 3 simple hashtags.
Month: {month_label}
Stats:
- Strava: {strava.total_activities} activities, {strava.total_distance_km:.1f} km, {strava.moving_time_hours:.1f} hours
- Music: top track {music.top_track or "unknown"}, genres {genre_line}, {music.total_minutes_listened} minutes listened
Calendar:
{highlights or "- No calendar highlights captured."}
Recent life updates:
{update_lines or "- No updates submitted this month."}
"""


def generate_ai_wrap_summary(
    month_label: str,
    updates: List[LifeUpdateSnippet],
    strava: StravaSummary,
    music: MusicSummary,
    calendar: CalendarSummary,
) -> str:
    prompt = build_prompt(month_label, updates, strava, music, calendar)

    # Return a deterministic fallback if OpenAI is not configured.
    fallback = (
        f"This month ({month_label}) looked active with {strava.total_activities} workouts "
        f"covering about {strava.total_distance_km:.1f} km. You leaned into {', '.join(music.top_genres) or 'a mix of sounds'} "
        f"and your top track was {music.top_track or 'a rotating set of favorites'}. "
        f"{(calendar.highlights[0].title if calendar.highlights else 'You kept time for the things that matter')} "
        f"and there are plenty of moments worth sharing. #goodvibes #momentum #keepgoing"
    )

    if not openai_client:
        return fallback

    try:
        response = openai_client.responses.create(
            model="gpt-5-mini",
            input=[
                {
                    "role": "system",
                    "content": "You write concise, kind month-in-review blurbs. Avoid marketing tone.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        output_text = getattr(response, "output_text", None) or fallback
        return output_text.strip()
    except Exception as e:  # pragma: no cover - network dependent
        print("OpenAI summarization failed, using fallback:", e)
        return fallback


# ---------- Routes ----------
@router.get("/this-month", response_model=WrapResponse)
async def get_this_month_wrap(
    user_id: str = Query(..., description="Supabase auth user id (from supabase.auth.getUser)"),
):
    """
    Combined payload used by the This Month Wrapped page.
    - user_id arrives via query param: /api/wrap/this-month?user_id=...
    - Life updates pull from Supabase; other integrations are mocked for now.
    - Swap the mock helpers with real API calls without changing the frontend contract.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    start, end = current_month_range()
    month_label = start.strftime("%B %Y")

    life_updates = fetch_recent_life_updates(user_id, start, end)
    strava_summary = get_mock_strava_summary(user_id)
    music_summary = get_mock_music_summary(user_id)
    calendar_summary = get_mock_calendar_highlights()
    ai_summary = generate_ai_wrap_summary(month_label, life_updates, strava_summary, music_summary, calendar_summary)

    return WrapResponse(
        month_label=month_label,
        ai_summary=ai_summary,
        strava=strava_summary,
        music=music_summary,
        calendar=calendar_summary,
        life_updates=life_updates,
    )
