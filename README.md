# Says So Agent

AI-powered agent that analyzes public user sentiment for any product or service using real Twitter/X and Reddit data, accessed through delegated authenticated sessions on the Sela Network.

## How It Works

1. You ask about a product or service (e.g. "Cursor", "Notion", "ChatGPT")
2. The agent searches Twitter/X and Reddit via the Sela P2P network using delegated logged-in browser sessions
3. It collects up to 20 posts per platform and feeds them to OpenAI for analysis
4. You get a structured sentiment summary: **positive**, **negative**, **neutral**, or **mixed** — with supporting reasoning

The agent only **reads** public posts. It never posts, likes, replies, or interacts on any platform.

## Example Output

> ### 1) Sentiment Summary
> - **Overall sentiment:** positive
> - Users widely praise the product's speed and responsiveness
> - Multiple posts highlight recent improvements to the editing experience
> - Some frustration around pricing changes, but outweighed by positive reception
> - Community engagement is active with constructive feedback
>
> ### 2) Coverage Notes
> - Platforms successfully analyzed: Twitter/X
> - Reddit was not enabled for this analysis
> - Content accessed via authenticated Sela Network sessions
>
> ### 3) Confidence & Unknowns
> - Based on 9 recent posts from Twitter/X search results
> - Sentiment is consistent across most posts, lending moderate confidence
> - A broader sample across both platforms would strengthen the conclusion

## Architecture

```
Browser (localhost:3000)
    |
    |  Chat UI with real-time activity log
    |
    v
Next.js API Route (/api/chat)
    |
    |-- Searches Twitter/X + Reddit in parallel via @selanet/sdk
    |-- Collects posts from delegated browser sessions on the P2P network
    '-- Streams structured sentiment analysis from OpenAI
            |
            v
      Sela P2P Network (libp2p + Kademlia DHT)
            |
            v
      Agent Node (desktop app with Chrome CDP)
      Browses platforms using delegated logged-in sessions
```

## Prerequisites

- **Node.js** >= 18
- **OpenAI API key** — get one at https://platform.openai.com/api-keys
- **Sela Agent Node** — a running agent node that has been granted access to Twitter/X (and optionally Reddit) browser sessions. The agent node is a separate desktop application that connects to the Sela P2P network and provides authenticated browser access to clients like this one. You'll need to:
  1. Install and run the Sela agent node
  2. Complete onboarding by logging into Twitter/X (and optionally Reddit) through the agent node's browser
  3. Ensure the agent node is connected to the same Sela network (same bootstrap peers and Kademlia protocol)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vincent-contreras/says-so-agent.git
cd says-so-agent

# Install dependencies
npm install

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

# Platforms to search (comma-separated: twitter,reddit)
ENABLED_PLATFORMS=twitter
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask about any product or service.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for sentiment analysis |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model to use |
| `SELA_API_KEY` | Yes | — | API key for the Sela P2P network |
| `BOOTSTRAP_PEERS` | Yes | — | Multiaddr of the Sela bootstrap node for DHT discovery |
| `ENABLED_PLATFORMS` | No | `twitter` | Comma-separated list of platforms to search (`twitter`, `reddit`) |
| `SELA_SKIP_API_KEY_VALIDATION` | No | `false` | Skip API key format validation (for dev/testing) |
| `SELA_CONNECTION_TIMEOUT` | No | `30000` | Connection timeout in milliseconds |
| `SELA_REQUEST_TIMEOUT` | No | `60000` | Request timeout in milliseconds |

## Project Structure

```
says-so-agent/
├── app/
│   ├── api/chat/route.ts        # API route — orchestrates Sela search + OpenAI analysis
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   ├── chat.tsx                 # Main chat UI with activity log integration
│   ├── chat-messages.tsx        # Message list with auto-scroll
│   ├── chat-input.tsx           # Auto-resizing input textarea
│   ├── message.tsx              # Individual message with markdown rendering
│   ├── activity-log.tsx         # Real-time Sela browsing activity panel
│   ├── sidebar.tsx              # Conversation history sidebar
│   └── icons.tsx                # SVG icons (Twitter, Reddit, activity, etc.)
├── lib/
│   ├── sela-adapter.ts          # Sela SDK wrapper — singleton client, search, browse
│   ├── sentiment-engine.ts      # Builds the analysis prompt from collected posts
│   ├── agent.ts                 # Loads the agent system prompt
│   ├── types.ts                 # Shared TypeScript types
│   └── hooks/
│       └── use-local-storage.ts # Conversation persistence
├── agents/default/AGENT.md      # Agent system prompt defining behavior and rules
├── vendor/@selanet/sdk/         # Vendored Sela SDK (native Node.js addon)
├── .env.example                 # Environment variable template
└── next.config.js               # Webpack config for native addon support
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS 3.4
- **LLM:** OpenAI (gpt-4o) via Vercel AI SDK
- **Data Access:** Sela Network P2P SDK (native Node.js addon built with napi-rs)

## Privacy & Safety

- Read-only access — never posts, likes, replies, votes, or sends messages
- Never deanonymizes users or exposes usernames
- Never quotes private content or accesses non-public data
- All platform access goes through authenticated Sela Network sessions, clearly disclosed in output
- If data can't be accessed (rate limits, login failure, anti-bot detection), the agent states the limitation explicitly
- If sentiment is unclear, the agent outputs "Sentiment is mixed or inconclusive" rather than guessing

## Development

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Platform Support

The vendored `@selanet/sdk` includes a prebuilt native binary for **macOS Apple Silicon (arm64)** only. To run on other platforms (macOS x64, Linux, Windows), the native addon must be rebuilt from the Sela SDK source for your target architecture.
