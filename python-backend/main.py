import base64
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import List


load_dotenv()
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _to_data_url(image_bytes: bytes, filename: str) -> str:
    ext = (filename.split(".")[-1] or "png").lower()
    if ext not in {"png","jpg","jpeg","webp","gif"}:
        ext = "png" 
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/{ext};base64,{b64}"


@app.post("/summarize-update")
async def summarize_update(
    user_summary: str = Form(...),
    update_id: str = Form(...),
    photos: List[UploadFile] = File(default=[])
):
    try:
        content_items = [{"type": "input_text", "text": f"Summarize this life update: {user_summary}"}]
        for f in photos:
            img_bytes = await f.read()
            data_url = _to_data_url(img_bytes, f.filename)
            content_items.append({
                "type": "input_image",
                "image_url": data_url
            })


        print("Hereeeeeee")
        # print(content_items)
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
        data = supabase.table("life_updates").update({"ai_summary": ai_summary}).eq("id", update_id).execute()

        return {"success": True, "ai_summary": ai_summary, "data": data.data, "photos": photos}

        # return {"success": True, "ai_summary": "Summary placeholder", "data": "data placeholder"}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))