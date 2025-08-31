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

# class SummaryRequest(BaseModel):
#     user_summary: Form(...)
#     update_id: Form(...)
#     photos: List[UploadFile] = File(default=[])


@app.post("/summarize-update")
async def summarize_update(
    user_summary: str = Form(...),
    update_id: str = Form(...),
    photos: List[UploadFile] = File(default=[])
):
    try:
        # Use OpenAI API to summarize
        # completion = client.chat.completions.create(
        #     model="gpt-5-mini",
        #     messages=
        # )
        # Read bytes if you need them:
        # Read files → data URLs for vision
        content_items = [{"type": "text", "text": user_summary}]
        for f in photos:
            img_bytes = await f.read()
            data_url = _to_data_url(img_bytes, f.filename)
            content_items.append({
                "type": "image_url",
                "image_url": {"url": data_url}
            })


        print("Hereeeeeee")
        print(content_items)
        # response = client.responses.create(
        #     model="gpt-5-nano",
        #     input=[
        #         {"role": "system", 
        #          "content": """
        #          You are the copy + summarization engine for a social app that turns a user’s recent life moments into short, upbeat posts.
        #          Voice & vibe: warm, encouraging, playful but never cringe.
        #          Goal: produce a concise post + optional bullets + 3–5 hashtags.
        #         """
        #         },
        #         {"role": "user", "content": f"Summarize this life update: {req.user_summary}"}

        #     ]
        # )

        # ai_summary = response.output_text.strip()
        # print("AI Summary:", ai_summary)
        # # Update Supabase
        # data = supabase.table("life_updates").update({"ai_summary": ai_summary}).eq("id", req.update_id).execute()

        # return {"success": True, "ai_summary": ai_summary, "data": data.data}

        return {"success": True, "ai_summary": "Summary placeholder", "data": "data placeholder"}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))