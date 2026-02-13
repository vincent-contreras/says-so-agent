"""
FastAPI application — serves the static React frontend and the /api/chat endpoint.

Usage:
    cd says-so-agent
    python -m uvicorn backend.main:app --port 3000
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Load .env.local (then .env as fallback)
env_local = Path(__file__).resolve().parent.parent / ".env.local"
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_local.exists():
    load_dotenv(env_local, override=True)
elif env_file.exists():
    load_dotenv(env_file, override=True)

from backend.chat_route import router as chat_router


app = FastAPI()

# Mount the chat API
app.include_router(chat_router)

# Static file serving from Next.js export
OUT_DIR = Path(__file__).resolve().parent.parent / "out"


if OUT_DIR.exists():
    # Serve _next/ static assets
    next_dir = OUT_DIR / "_next"
    if next_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="next-static")

    # Serve other static files (favicon, images, etc.)
    @app.get("/favicon.ico")
    async def favicon():
        fav = OUT_DIR / "favicon.ico"
        if fav.exists():
            return FileResponse(str(fav))
        return HTMLResponse("", status_code=404)

    # Catch-all: serve index.html for SPA routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try exact file first
        file_path = OUT_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        # Try with .html extension (Next.js static export convention)
        html_path = OUT_DIR / f"{full_path}.html"
        if html_path.is_file():
            return FileResponse(str(html_path))

        # Fall back to index.html
        index = OUT_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))

        return HTMLResponse("<h1>Build the frontend first: npm run build</h1>", status_code=404)
