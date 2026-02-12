"""
Sela Network adapter — wraps sela-browse-sdk for tweet fetching.

Singleton SelaClient lifecycle: create -> start -> discover -> connect.
Activity log collection for the UI.
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from sela_browse_sdk import (
    BrowseOptions,
    DiscoveryOptions,
    SelaClient,
)


# -- Types -------------------------------------------------------------------

@dataclass
class ActivityLogEntry:
    id: str
    timestamp: str
    type: Literal["search", "browse", "error", "info"]
    platform: Literal["twitter", "reddit", "system"]
    message: str
    url: str | None = None
    details: str | None = None


@dataclass
class SelaContentItem:
    content_type: str
    fields: dict[str, Any]
    url: str | None = None


@dataclass
class SelaUserTweetsResult:
    username: str
    items: list[SelaContentItem]
    authenticated: bool
    error: str | None = None


# -- Module state ------------------------------------------------------------

_client: SelaClient | None = None
_init_lock = asyncio.Lock()
_last_error: str | None = None
_activity_log: list[ActivityLogEntry] = []


def _log(
    type_: Literal["search", "browse", "error", "info"],
    platform: Literal["twitter", "reddit", "system"],
    message: str,
    url: str | None = None,
    details: str | None = None,
) -> ActivityLogEntry:
    entry = ActivityLogEntry(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        type=type_,
        platform=platform,
        message=message,
        url=url,
        details=details,
    )
    _activity_log.append(entry)
    return entry


def get_activity_log() -> list[dict]:
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "type": e.type,
            "platform": e.platform,
            "message": e.message,
            "url": e.url,
            "details": e.details,
        }
        for e in _activity_log
    ]


def clear_activity_log() -> None:
    global _activity_log
    _activity_log = []


# -- Client lifecycle --------------------------------------------------------

async def _initialize_client() -> SelaClient:
    global _client, _last_error

    api_key = os.environ.get("SELA_API_KEY", "")
    if not api_key:
        raise RuntimeError("SELA_API_KEY environment variable is not set")

    try:
        client = await SelaClient.with_api_key(api_key)
        await client.start()
        _log("info", "system", "Sela client started, connected to P2P network")

        agents = await client.discover_agents(
            "web",
            DiscoveryOptions(max_agents=5, timeout_ms=15000),
        )

        if not agents:
            raise RuntimeError("No agents with 'web' capability found on the network")

        _log("info", "system", f"Discovered {len(agents)} agent(s)")

        await client.connect_to_first_available(agents, None)
        _log("info", "system", "Connected to first available agent")

        _last_error = None
        _client = client
        return client
    except Exception as exc:
        _client = None
        _last_error = str(exc)
        _log("error", "system", f"Failed to initialize Sela: {_last_error}")
        raise


async def _ensure_client() -> SelaClient:
    global _client, _last_error

    if _client is not None:
        try:
            state = await _client.state()
            if state == "running":
                return _client
            if state in ("stopped", "created"):
                await _client.start()
                _log("info", "system", "Sela client restarted")
                return _client
        except Exception as exc:
            _last_error = str(exc)
            _log("error", "system", f"Failed to restart Sela client: {_last_error}")
            _client = None

    async with _init_lock:
        # Double-check after acquiring lock
        if _client is not None:
            try:
                state = await _client.state()
                if state == "running":
                    return _client
            except Exception:
                _client = None
        return await _initialize_client()


async def shutdown_client() -> None:
    global _client
    if _client is not None:
        try:
            await _client.shutdown()
        except Exception:
            pass
        _client = None


# -- Public API --------------------------------------------------------------

async def sela_get_user_tweets(
    username: str,
    count: int = 10,
) -> SelaUserTweetsResult:
    username = username.lstrip("@")
    search_url = (
        f"https://x.com/search?q={_url_encode(f'from:{username}')}"
        f"&src=typed_query&f=top"
    )

    try:
        client = await _ensure_client()
        _log("browse", "twitter", f"Fetching tweets for @{username}", search_url)

        response = await client.browse(
            search_url,
            BrowseOptions(
                timeout_ms=60000,
                count=count,
                parse_only=True,
                api_key="dev_bypass_token",
            ),
        )

        items: list[SelaContentItem] = []
        for sc in response.page.content:
            try:
                fields = json.loads(sc.fields_json)
            except (json.JSONDecodeError, TypeError):
                fields = {"raw": sc.fields_json}

            items.append(SelaContentItem(
                content_type=sc.content_type or "tweet",
                fields=fields,
                url=fields.get("url"),
            ))

        _log(
            "info",
            "twitter",
            f"Retrieved {len(items)} tweets for @{username}",
            search_url,
            f"Page type: {response.page.page_type}",
        )

        return SelaUserTweetsResult(
            username=username,
            items=items[:count],
            authenticated=True,
        )
    except Exception as exc:
        error_msg = str(exc)
        _log("error", "twitter", f"Failed to fetch tweets for @{username}: {error_msg}", search_url)
        return SelaUserTweetsResult(
            username=username,
            items=[],
            authenticated=False,
            error=error_msg,
        )


def _url_encode(s: str) -> str:
    from urllib.parse import quote
    return quote(s, safe="")
