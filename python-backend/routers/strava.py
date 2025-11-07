# routers/strava.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, os
from dotenv import load_dotenv

router = APIRouter()

class StravaTokenRequest(BaseModel):
    code: str
    user_id: str | None = None

class StravaTokenResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    expires_in: int | None = None
    token_type: str | None = None
    scope: str | None = None
    athlete: dict | None = None
    saved: bool | None = None

@router.post("/token", response_model=StravaTokenResponse)
async def exchange_token(req: StravaTokenRequest):
    # Ensure .env is loaded in THIS process before reading
    load_dotenv()

    STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID") or os.getenv("VITE_STRAVA_CLIENT_ID")
    STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")

    if not STRAVA_CLIENT_ID or not STRAVA_CLIENT_SECRET:
        raise HTTPException(500, "Strava credentials not configured on server")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://www.strava.com/oauth/token",
                data={
                    "client_id": STRAVA_CLIENT_ID,
                    "client_secret": STRAVA_CLIENT_SECRET,
                    "code": req.code,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
    except httpx.RequestError as e:
        raise HTTPException(502, f"Network error to Strava: {e!s}")

    if resp.status_code != 200:
        # Print Strava’s exact error for debugging
        print("Strava token error:", resp.status_code, resp.text)
        raise HTTPException(resp.status_code, resp.text)

    return resp.json()
