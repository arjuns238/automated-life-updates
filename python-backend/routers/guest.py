# routers/guest.py
"""
Guest session bootstrapper.

Creates a disposable Supabase auth user using the service role key so the
frontend can immediately sign in and get a valid session for RLS-protected
endpoints. The client will use the returned credentials with
`supabase.auth.signInWithPassword`.
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

# Optional Supabase client (only available when service role envs are set)
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
    except Exception as e:  # pragma: no cover - best effort init
        print("Supabase client init failed for guest sessions:", e)
        supabase = None

router = APIRouter()


class GuestSessionResponse(BaseModel):
    user_id: str
    email: str
    password: str
    guest: bool = True
    expires_at: Optional[str] = None


def generate_guest_credentials() -> tuple[str, str]:
    email = f"guest-{uuid4().hex}@guest.local"
    password = secrets.token_urlsafe(18)
    return email, password


@router.post("/session", response_model=GuestSessionResponse)
def create_guest_session() -> GuestSessionResponse:
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured for guest sessions")

    email, password = generate_guest_credentials()
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(days=7)

    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "guest": True,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat(),
        },
    }

    try:
        res = supabase.auth.admin.create_user(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create guest user: {e}")

    user_obj = getattr(res, "user", None) or getattr(res, "data", None) or {}
    user_id = getattr(user_obj, "id", None) if not isinstance(user_obj, dict) else user_obj.get("id")
    if not user_id:
        raise HTTPException(status_code=500, detail="Guest user created but id missing in response")

    return GuestSessionResponse(
        user_id=str(user_id),
        email=email,
        password=password,
        guest=True,
        expires_at=expires_at.isoformat(),
    )
