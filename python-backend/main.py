import base64
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from backend_utils import clean_storage_url, _safe_name
from routers import strava

load_dotenv()
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
# SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(strava.router, prefix="/api/strava", tags=["strava"])
print("HEREEEE", supabase.storage.list_buckets())

@app.post("/summarize-update")
async def summarize_update(
    user_summary: str = Form(...),
    update_id: str = Form(...),
    photos: List[UploadFile] = File(default=[])
):
    try:
        photo_urls = []
        for f in photos:
            file_bytes = await f.read()
            filename = _safe_name(f.filename or "photo.jpg")
            storage_path = f"updates/{update_id}/{filename}"
            # Upload file to Supabase Storage (Like S3 - good for images)
            upload_res = supabase.storage.from_(SUPABASE_BUCKET).upload(
                    storage_path,
                    file_bytes,
                    file_options={"content-type": f.content_type or "image/jpeg"}
            )
            if getattr(upload_res, "error", None):
                raise HTTPException(status_code=500, detail=f"Upload failed: {upload_res.error}")
            
            # Get a public URL to store in DB (This necessitates making the bucket public)
            public_url_res = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)
            if isinstance(public_url_res, dict):
                url = public_url_res.get("data", {}).get("publicUrl", "")
            else:
                url = getattr(public_url_res, "public_url", "") or str(public_url_res)
            photo_urls.append(url)

        content_items = [{"type": "input_text", "text": f"Summarize this life update: {user_summary}"}]
        for raw in photo_urls:
            url = clean_storage_url(raw)
            content_items.append({"type": "input_image", "image_url": url})
        # Now call OpenAI with text + image URLs
        response = client.responses.create(
            model="gpt-5-mini",
            input=[
                {"role": "system", 
                 "content": """
                You create upbeat, authentic social updates from mixed text + images.
                Fusion rules:
                - Read text and images together; cross-reference details.
                - If text and image conflict, prefer the text.
                - If an image is ambiguous, describe it briefly without guessing.
                - Merge overlapping details; avoid repeats.
                - Keep privacy: no precise addresses or sensitive info.
                Goal: produce a concise post + 3–5 hashtags.
                Style: warm, encouraging, never cringe; 0–2 emojis; 3–5 simple hashtags.
                Voice & vibe: warm, encouraging, playful but never cringe.
                """
                },
                {"role": "user", "content": content_items}

            ]
        )

        ai_summary = response.output_text.strip()
        print("AI Summary:", ai_summary)
        # Update Supabase
        data = supabase.table("life_updates").update({"ai_summary": ai_summary, "photos":photo_urls}).eq("id", update_id).execute()

        return {"success": True, "ai_summary": ai_summary, "photo_urls": photo_urls}

        # return {"success": True, "ai_summary": "Summary placeholder", "photo_urls": photo_urls}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))