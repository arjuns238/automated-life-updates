import base64
import re
def _to_data_url(image_bytes: bytes, filename: str) -> str:
    ext = (filename.split(".")[-1] or "png").lower()
    if ext not in {"png","jpg","jpeg","webp","gif"}:
        ext = "png" 
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/{ext};base64,{b64}"

def _safe_name(name: str) -> str:
    # sanitize filename: letters, numbers, dot, dash, underscore only
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:120]

def clean_storage_url(u: str) -> str:
    u = (u or "").strip()
    # remove trailing punctuation that breaks fetches
    while u and u[-1] in ").,;!?\"'":
        u = u[:-1]
    return u