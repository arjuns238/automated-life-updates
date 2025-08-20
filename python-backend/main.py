from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()
summarizer = pipeline("summarization", model="openai/gpt-oss-20b")

class SummaryRequest(BaseModel):
    user_summary: str
    update_id: int

@app.post("/summarize-update")
async def summarize_update(req: SummaryRequest):
    try:
        result = summarizer(req.user_summary, max_length=60, min_length=20, do_sample=False)
        ai_summary = result[0]['summary_text']
        # Update Supabase
        data = supabase.table("life_updates").update({"ai_summary": ai_summary}).eq("id", req.update_id).execute()
        return {"success": True, "ai_summary": ai_summary, "data": data.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
