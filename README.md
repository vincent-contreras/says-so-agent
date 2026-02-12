# Says So Agent

AI-powered agent that retrieves and summarizes a Twitter/X user's recent tweeting activity using authenticated sessions on the Sela Network.

## How It Works

1. You provide a Twitter/X username (e.g. `@elonmusk` or `elonmusk 20`)
2. The agent fetches recent tweets via the Sela P2P network using delegated logged-in browser sessions
3. It feeds the collected tweets to OpenAI for a factual activity summary
4. You get a structured report: posting frequency, main topics, content breakdown, notable observations, and engagement snapshot

The agent only **reads** public tweets. It never posts, likes, replies, or interacts on any platform.

## Example Output

> ### Activity Summary for @username
>
> *Retrieved 10 tweets via authenticated Sela Network session.*
>
> **Posting frequency:** 10 tweets in the last 2 days, averaging ~5 tweets per day
>
> **Main topics:**
> - Topic 1 — brief factual description
> - Topic 2 — brief factual description
>
> **Content breakdown:**
> - Original tweets: 7
> - Replies: 2
> - Retweets/quote-tweets: 1
>
> **Notable observations:**
> - Factual patterns observed in the data
>
> **Engagement snapshot:**
> - Highest-engagement tweet: brief description, ~500 likes
> - Typical engagement range: 50-200 likes per tweet

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
    |-- POST /api/chat   Fetches tweets via Sela + streams OpenAI summary
    |
    |-- Sela Python SDK (sela-browse-sdk) --> P2P Network --> Agent Node
    '-- OpenAI Python SDK --> streaming response (Vercel AI data stream protocol)
```

## Prerequisites

- **Python** >= 3.9
- **Node.js** >= 18 (for building the frontend)
- **OpenAI API key** — get one at https://platform.openai.com/api-keys
- **Sela Agent Node** — a running agent node that has been granted access to Twitter/X browser sessions. The agent node is a separate desktop application that connects to the Sela P2P network and provides authenticated browser access to clients like this one. You'll need to:
  1. Install and run the Sela agent node
  2. Complete onboarding by logging into Twitter/X through the agent node's browser
  3. Ensure the agent node is connected to the same Sela network (same bootstrap peers and Kademlia protocol)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vincent-contreras/says-so-agent.git
cd says-so-agent

# Install frontend dependencies and build static site
npm install
npm run build

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install backend/vendor/sela_browse_sdk-*.whl

# Configure environment
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```bash
# Required — OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Required — Sela Network
SELA_API_KEY=sk_live_your-sela-key
BOOTSTRAP_PEERS=/dnsaddr/bootstrap.selanet.ai

# Optional
SELA_SKIP_API_KEY_VALIDATION=true
```

Start the server:

```bash
source .venv/bin/activate
python -m uvicorn backend.main:app --port 3000
```

Open [http://localhost:3000](http://localhost:3000) and enter a Twitter/X username.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for tweet summarization |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model to use |
| `SELA_API_KEY` | Yes | — | API key for the Sela P2P network |
| `BOOTSTRAP_PEERS` | Yes | — | Multiaddr of the Sela bootstrap node for DHT discovery |
| `ENABLED_PLATFORMS` | No | `twitter` | Comma-separated list of enabled platforms |
| `SELA_SKIP_API_KEY_VALIDATION` | No | `false` | Skip API key format validation (for dev/testing) |

## Project Structure

```
says-so-agent/
├── backend/
│   ├── main.py                 # FastAPI app — static file serving + entrypoint
│   ├── chat_route.py           # POST /api/chat — orchestrates Sela + OpenAI
│   ├── sela_adapter.py         # SelaClient singleton — P2P connection + tweet fetching
│   ├── tweet_summary_engine.py # Builds the OpenAI analysis prompt
│   ├── data_stream.py          # Vercel AI SDK data stream protocol encoder
│   ├── requirements.txt        # Python dependencies
│   └── vendor/                 # Vendored sela-browse-sdk wheel
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/
│   ├── chat.tsx                # Main chat UI with activity log integration
│   ├── chat-messages.tsx       # Message list with auto-scroll
│   ├── chat-input.tsx          # Auto-resizing input textarea
│   ├── message.tsx             # Individual message with markdown rendering
│   ├── activity-log.tsx        # Real-time Sela browsing activity panel
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

## Tech Stack

- **Backend:** Python FastAPI + uvicorn
- **Frontend:** Next.js 15 (static export), React 19, Tailwind CSS 3.4
- **LLM:** OpenAI (gpt-4o) via Python SDK
- **Data Access:** Sela Network Python SDK (sela-browse-sdk, native binary built with maturin/uniffi)
- **Streaming:** Vercel AI SDK data stream protocol (frontend `useChat()` hook)

## Privacy & Safety

- Read-only access — never posts, likes, replies, or interacts
- Never exposes private information or non-public content
- All platform access goes through authenticated Sela Network sessions, clearly disclosed in output
- No sentiment analysis or opinion — purely factual activity summaries
- If data can't be accessed, the agent states the limitation explicitly

## Platform Support

The vendored `sela-browse-sdk` wheel is built for **macOS Apple Silicon (arm64)** only. To run on other platforms, rebuild the wheel from the Sela SDK source using `maturin build --release`.
