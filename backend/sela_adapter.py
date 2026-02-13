"""
Sela Network adapter — calls the Sela REST API for tweet fetching.

Uses POST /api/rpc/scrapeUrl with scrapeType: TWITTER_PROFILE.
Activity log collection for the UI.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

import httpx


# -- Types -------------------------------------------------------------------

@dataclass
class ActivityLogEntry:
    id: str
    timestamp: str
    type: Literal["search", "browse", "error", "info"]
    platform: Literal["twitter", "system"]
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

_activity_log: list[ActivityLogEntry] = []


def _log(
    type_: Literal["search", "browse", "error", "info"],
    platform: Literal["twitter", "system"],
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


# -- Public API --------------------------------------------------------------

async def sela_get_user_tweets(
    username: str,
    count: int = 10,
) -> SelaUserTweetsResult:
    username = username.lstrip("@")
    profile_url = f"https://x.com/{username}"

    api_key = os.environ.get("SELA_API_KEY", "")
    if not api_key:
        error_msg = "SELA_API_KEY environment variable is not set"
        _log("error", "system", error_msg)
        return SelaUserTweetsResult(username=username, items=[], authenticated=False, error=error_msg)

    base_url = os.environ.get("SELA_API_BASE_URL", "https://api.selanetwork.io")
    endpoint = f"{base_url}/api/rpc/scrapeUrl"

    try:
        _log("browse", "twitter", f"Fetching tweets for @{username}", profile_url)

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                endpoint,
                json={
                    "url": profile_url,
                    "scrapeType": "TWITTER_PROFILE",
                    "postCount": count,
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            error_msg = data.get("error", "API returned success=false")
            _log("error", "twitter", f"Sela API error for @{username}: {error_msg}", profile_url)
            return SelaUserTweetsResult(username=username, items=[], authenticated=False, error=error_msg)

        results = data.get("data", {}).get("result", [])

        items: list[SelaContentItem] = []
        for tweet in results:
            fields = {
                "content": tweet.get("content", ""),
                "likesCount": tweet.get("likesCount", 0),
                "repliesCount": tweet.get("repliesCount", 0),
                "retweetsCount": tweet.get("retweetsCount", 0),
                "postedAt": tweet.get("postedAt", ""),
                "username": tweet.get("username", ""),
                "tweetId": tweet.get("tweetId", ""),
            }
            tweet_url = tweet.get("tweetUrl", "")
            if tweet_url and not tweet_url.startswith("http"):
                tweet_url = f"https://x.com{tweet_url}"

            items.append(SelaContentItem(
                content_type="tweet",
                fields=fields,
                url=tweet_url,
            ))

        _log(
            "info",
            "twitter",
            f"Retrieved {len(items)} tweets for @{username}",
            profile_url,
        )

        return SelaUserTweetsResult(
            username=username,
            items=items[:count],
            authenticated=True,
        )
    except httpx.HTTPStatusError as exc:
        error_msg = f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
        _log("error", "twitter", f"Failed to fetch tweets for @{username}: {error_msg}", profile_url)
        return SelaUserTweetsResult(username=username, items=[], authenticated=False, error=error_msg)
    except Exception as exc:
        error_msg = str(exc)
        _log("error", "twitter", f"Failed to fetch tweets for @{username}: {error_msg}", profile_url)
        return SelaUserTweetsResult(username=username, items=[], authenticated=False, error=error_msg)
