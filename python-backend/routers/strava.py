from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class StravaTokenRequest(BaseModel):
    code: str

class StravaTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    athlete: dict

@router.post("/token", response_model=StravaTokenResponse)
async def exchange_token(request: StravaTokenRequest):
    try:
        client_id = os.getenv("VITE_STRAVA_CLIENT_ID")
        client_secret = os.getenv("STRAVA_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=500,
                detail="Strava credentials not configured"
            )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.strava.com/oauth/token",
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": request.code,
                    "grant_type": "authorization_code"
                }
            )

            if response.status_code != 200:
                print("Strava API error:", response.text)  # For debugging
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to exchange token with Strava"
                )

            data = response.json()
            return StravaTokenResponse(**data)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Network error when connecting to Strava: {str(e)}"
        )
