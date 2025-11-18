# AI Friend Flow

AI Friend Flow is a personal life-recapping app that turns your own notes plus connected integrations (like Strava) into a shareable update for friends. You jot down highlights, optionally attach photos, and the backend pulls in recent activity data, then crafts a short, upbeat summary. It’s built with a React/Tailwind frontend, a Python FastAPI backend, and Supabase for auth/data, so you can automate sending thoughtful, consistent updates without writing them from scratch.

## Stack
- Frontend: Vite, React, TypeScript, Tailwind, shadcn-ui
- Backend: Python, FastAPI (uvicorn), Strava + Supabase integrations
- Misc: Supabase auth/storage/DB, Vite dev server

## Getting started
Prereqs: Node.js, npm, Python 3.10+, and Supabase env vars configured.

```sh
# Clone and install
git clone <YOUR_GIT_URL>
cd ai-friend-flow
npm install

# (Optional) create a Python venv
python -m venv .venv
source .venv/bin/activate
pip install -r python-backend/requirements.txt

# Run the backend (from python-backend/)
uvicorn main:app --reload --port 8000

# In another terminal, run the frontend (from repo root)
npm run dev
```

Visit the displayed Vite dev URL (typically http://localhost:5173).

## Project links
- Lovable project: https://lovable.dev/projects/aef9c645-d23a-44de-892a-30d7c1007de0
