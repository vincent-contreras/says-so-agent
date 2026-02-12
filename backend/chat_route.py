"""
POST /api/chat — main orchestration route.

Flow:
1. Extract last user message
2. Greeting check -> stream simple LLM response
3. Parse @username + count -> fetch tweets via Sela -> build prompt -> stream enriched response
4. Attach x-activity-log header
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from backend.data_stream import format_data_stream
from backend.sela_adapter import (
    clear_activity_log,
    get_activity_log,
    sela_get_user_tweets,
)
from backend.tweet_summary_engine import build_tweet_summary_prompt

router = APIRouter()

# -- Agent definition (cached) -----------------------------------------------

_agent_definition: str | None = None


def _get_agent_definition() -> str:
    global _agent_definition
    if _agent_definition is None:
        agent_path = Path(__file__).resolve().parent.parent / "agents" / "default" / "AGENT.md"
        try:
            _agent_definition = agent_path.read_text().strip()
        except FileNotFoundError:
            _agent_definition = (
                "You are a Twitter research assistant that retrieves and "
                "summarizes a user's recent tweeting activity."
            )
    return _agent_definition


# -- OpenAI streaming --------------------------------------------------------

async def _openai_stream(
    messages: list[dict],
    system: str,
) -> AsyncIterator[str]:
    """Stream text deltas from OpenAI."""
    client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")

    stream = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, *messages],
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield delta.content


# -- Helpers ------------------------------------------------------------------

_EXACT_GREETINGS = [
    "hi", "hello", "hey", "sup", "yo", "howdy",
    "greetings", "good morning", "good afternoon", "good evening",
]
_GREETING_FOLLOWUPS = [
    "there", "bot", "agent", "buddy", "friend", "everyone", "all",
]


def _is_greeting(text: str) -> bool:
    lower = text.lower().strip()
    if lower in _EXACT_GREETINGS:
        return True
    for g in _EXACT_GREETINGS:
        if lower.startswith(f"{g}!") or lower.startswith(f"{g},") or lower.startswith(f"{g}."):
            return True
        for f in _GREETING_FOLLOWUPS:
            if lower == f"{g} {f}" or lower.startswith(f"{g} {f}!") or lower.startswith(f"{g} {f},"):
                return True
    return False


def _parse_username_and_count(text: str) -> tuple[str, int] | None:
    trimmed = text.strip()

    # Pattern 1: explicit @username anywhere
    at_match = re.search(r"@([A-Za-z0-9_]{1,15})", trimmed)
    if at_match:
        username = at_match.group(1)
        count = _extract_count(trimmed)
        return username, count

    # Pattern 2: bare username (short, no spaces except optional count)
    bare_match = re.match(r"^([A-Za-z0-9_]{1,15})(?:\s+(\d+))?$", trimmed)
    if bare_match and not _is_greeting(trimmed):
        username = bare_match.group(1)
        count = _clamp_count(int(bare_match.group(2))) if bare_match.group(2) else 10
        return username, count

    return None


def _extract_count(text: str) -> int:
    m = re.search(r"\b(\d{1,2})\s*(?:tweets?|posts?)?\b", text, re.IGNORECASE)
    if not m:
        m = re.search(r"\blast\s+(\d{1,2})\b", text, re.IGNORECASE)
    if m:
        return _clamp_count(int(m.group(1)))
    return 10


def _clamp_count(n: int) -> int:
    return max(1, min(30, n))


def _extract_user_query(message: dict) -> str:
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            p.get("text", "")
            for p in content
            if isinstance(p, dict) and p.get("type") == "text"
        )
    return str(content)


# -- Route --------------------------------------------------------------------

@router.post("/api/chat")
async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        return _json_error("Invalid JSON body", 400)

    messages = body.get("messages")
    if not isinstance(messages, list):
        return _json_error("Invalid request: messages array required", 400)

    agent_def = _get_agent_definition()

    # Find last user message
    last_user = None
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user = m
            break

    if last_user is None:
        return _stream_simple(messages, agent_def)

    user_query = _extract_user_query(last_user)

    # First message greeting check
    user_messages = [m for m in messages if m.get("role") == "user"]
    is_first = len(user_messages) == 1

    if is_first and _is_greeting(user_query):
        return _stream_simple(messages, agent_def)

    # Try to extract a Twitter username
    parsed = _parse_username_and_count(user_query)
    if parsed is None:
        return _stream_simple(messages, agent_def)

    username, count = parsed

    # -- Sela-powered tweet lookup --
    clear_activity_log()

    tweets = await sela_get_user_tweets(username, count)
    summary_prompt = build_tweet_summary_prompt(username, tweets, count)

    # Build activity log header
    activity_log = get_activity_log()
    activity_log_json = json.dumps(activity_log)
    if len(activity_log_json) > 7000:
        activity_log_json = json.dumps(activity_log[-10:])

    # Replace last user message with enriched prompt
    enriched_messages = [
        {"role": m["role"], "content": _extract_user_query(m)}
        for m in messages[:-1]
    ]
    enriched_messages.append({"role": "user", "content": summary_prompt})

    async def stream():
        async for chunk in format_data_stream(_openai_stream(enriched_messages, agent_def)):
            yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8",
        headers={
            "x-vercel-ai-data-stream": "v1",
            "x-activity-log": activity_log_json,
        },
    )


def _stream_simple(messages: list[dict], agent_def: str) -> StreamingResponse:
    simple_messages = [
        {"role": m["role"], "content": _extract_user_query(m)}
        for m in messages
    ]

    async def stream():
        async for chunk in format_data_stream(_openai_stream(simple_messages, agent_def)):
            yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8",
        headers={"x-vercel-ai-data-stream": "v1"},
    )


def _json_error(message: str, status: int) -> StreamingResponse:
    from fastapi.responses import JSONResponse
    return JSONResponse({"error": message}, status_code=status)
