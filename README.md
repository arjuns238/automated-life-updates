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

## Progressive Web App

The Vite frontend now ships with [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/):

1. During development run `npm run dev` as usual — the plugin's development service worker is automatically enabled so you can test install/offline flows locally.
2. For a production-like test, run `npm run build && npm run preview` and open the preview URL in Chrome or Edge. Use the browser's "Install App" button (or the Application tab in DevTools) to install.
3. When new builds ship, the service worker updates itself (`registerType: autoUpdate`). Users see the fresh content on the next navigation; check the console logs for refresh/offline-ready messages while developing.

Front-end is hosted on Site is hosted on https://automated-life-updates.pages.dev/

Back-end is hosted on render on the URL - https://automated-life-updates.onrender.com

