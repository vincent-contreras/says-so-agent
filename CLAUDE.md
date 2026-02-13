# CLAUDE.md — Says So Agent

This file provides full context for any AI continuing work on this project.

## Project Summary

**Says So Agent** is a local browser-launched AI agent that retrieves and summarizes a Twitter/X user's recent tweeting activity. It scrapes **Twitter/X profiles** via the **Sela Network REST API** (`https://api.selanetwork.io/api/rpc/scrapeUrl`), then uses OpenAI to produce a factual activity summary.

- **Location:** `/Users/vincent/says-so-agent/`
- **Frontend:** Next.js 15, React 19, TypeScript 5.7, Tailwind CSS 3.4
- **Backend:** Python FastAPI + uvicorn
- **LLM Provider:** OpenAI API (`gpt-4o` via Python SDK)
- **Data Access:** Sela Network REST API (TWITTER_PROFILE scrapeType)

## Architecture

```
Browser (localhost:3000)
    |
    |  Static React app (built with Next.js export)
    |
    v
FastAPI (Python, port 3000)
    |
    |-- GET /            Serves static React frontend from out/
    |-- POST /api/chat   Fetches tweets via Sela REST API + streams OpenAI summary
    |
    |-- httpx POST to https://api.selanetwork.io/api/rpc/scrapeUrl
    '-- OpenAI Python SDK --> streaming response (Vercel AI data stream protocol)
```

## File Structure

```
says-so-agent/
├── backend/
│   ├── main.py                 # FastAPI app — static file serving + entrypoint
│   ├── chat_route.py           # POST /api/chat — orchestrates Sela + OpenAI
│   ├── sela_adapter.py         # Sela REST API wrapper (httpx-based)
│   ├── tweet_summary_engine.py # Builds the OpenAI analysis prompt
│   ├── data_stream.py          # Vercel AI SDK data stream protocol encoder
│   └── requirements.txt        # Python dependencies
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/
│   ├── chat.tsx                # Main chat UI with activity log integration
│   ├── chat-messages.tsx       # Message list with auto-scroll
│   ├── chat-input.tsx          # Auto-resizing input textarea
│   ├── message.tsx             # Individual message with markdown rendering
│   ├── activity-log.tsx        # Real-time Sela API activity panel
│   ├── sidebar.tsx             # Conversation history sidebar
│   └── icons.tsx               # SVG icons
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   └── hooks/
│       └── use-local-storage.ts # Conversation persistence
├── agents/default/AGENT.md     # Agent system prompt defining behavior and rules
├── out/                        # Static React build (generated, gitignored)
├── .env.example                # Environment variable template
└── next.config.js              # Static export config
```

## Key Files — What Each Does

### `backend/sela_adapter.py` (Sela REST API integration)
- `sela_get_user_tweets(username, count)` — calls `POST /api/rpc/scrapeUrl` with `scrapeType: "TWITTER_PROFILE"`
- Auth via `Authorization: Bearer ${SELA_API_KEY}`
- Parses `response["data"]["result"]` array into `SelaContentItem[]`
- Fields from API: `content`, `likesCount`, `repliesCount`, `retweetsCount`, `postedAt`, `tweetUrl`, `username`
- Config: `SELA_API_BASE_URL` env var (defaults to `https://api.selanetwork.io`)
- Activity log array exposed via `get_activity_log()` / `clear_activity_log()`

### `backend/tweet_summary_engine.py` (Prompt construction)
- `build_tweet_summary_prompt(username, tweets, count)` — formats collected tweets into a structured prompt
- Instructs OpenAI to produce the required output format (activity summary, topics, engagement)
- Enforces rules: no user deanonymization, no raw quotes, no guessing

### `backend/chat_route.py` (API route — orchestration center)
- `POST /api/chat` receives chat messages from the frontend
- If analysis needed: calls `sela_get_user_tweets()`, builds prompt via `build_tweet_summary_prompt()`, streams OpenAI response
- Attaches activity log as `x-activity-log` response header

### `agents/default/AGENT.md` (System prompt)
- Loaded server-side and injected as system message
- Defines the agent's role, interaction flow, output format, rules, and prohibited actions

## Environment Variables

```bash
OPENAI_API_KEY=sk-proj-...              # OpenAI API key (required)
# OPENAI_MODEL=gpt-4o                  # Optional, defaults to gpt-4o

SELA_API_KEY=...                        # Sela Network REST API key (required)
# SELA_API_BASE_URL=https://api.selanetwork.io  # Optional, defaults to this
```

## Build & Run

```bash
cd /Users/vincent/says-so-agent

# Install frontend dependencies and build static site
npm install
npm run build

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Configure environment
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY and SELA_API_KEY

# Start the server
python -m uvicorn backend.main:app --port 3000
# Opens at http://localhost:3000
```

No agent node, no P2P network, no native addons needed — just API keys.

## API Response Shape (Sela REST API)

```json
{
  "success": true,
  "data": {
    "result": [
      {
        "content": "tweet text...",
        "likesCount": 449,
        "repliesCount": 30,
        "retweetsCount": 83,
        "tweetId": "...",
        "tweetUrl": "/username/status/...",
        "username": "username",
        "postedAt": "2026-02-12T20:32:31.000Z",
        "image": "...",
        "video": []
      }
    ],
    "state": "completed",
    "status": "OK"
  }
}
```

Supports `postCount` and `replyCount` parameters to control how many items to fetch.

## Key Technical Notes

- **Activity log** passed via `x-activity-log` HTTP header (JSON array, truncated to ~7KB).
- **`isGreeting()` heuristic** in chat_route.py matches exact greetings + known filler words to avoid false positives.
- **`isShortQuery` check** (< 150 chars) determines if a message triggers analysis vs simple chat.
- **localStorage persistence** with key `"says-so-agent-chat"`.

## Tech Stack

- **Backend:** Python FastAPI + uvicorn
- **Frontend:** Next.js 15 (static export), React 19, Tailwind CSS 3.4
- **LLM:** OpenAI (gpt-4o) via Python SDK
- **Data Access:** Sela Network REST API (httpx)
- **Streaming:** Vercel AI SDK data stream protocol (frontend `useChat()` hook)
