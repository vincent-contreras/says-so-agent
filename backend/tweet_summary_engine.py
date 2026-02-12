"""
Tweet summary engine — takes collected tweets from a user's profile
and produces a structured activity summary prompt for OpenAI.
"""

from __future__ import annotations

from backend.sela_adapter import SelaUserTweetsResult


def build_tweet_summary_prompt(
    username: str,
    tweets: SelaUserTweetsResult,
    count: int,
) -> str:
    if tweets.error:
        return (
            f"I tried to fetch tweets for @{username} but encountered an error: {tweets.error}\n\n"
            "Please respond with an appropriate error message based on the AGENT.md error handling rules."
        )

    if not tweets.items:
        return (
            f"I fetched @{username}'s profile but found no recent tweets.\n\n"
            f'Please respond with an appropriate message (e.g., "@{username} hasn\'t posted recently.").'
        )

    tweet_entries: list[str] = []
    for i, item in enumerate(tweets.items):
        f = item.fields
        content = f.get("content") or f.get("text") or f.get("title") or ""
        likes = f.get("like_count") or f.get("likes") or ""
        retweets = f.get("retweet_count") or f.get("retweets") or ""
        replies = f.get("reply_count") or f.get("replies") or ""
        timestamp = f.get("timestamp") or f.get("date") or f.get("time") or ""
        author = f.get("author_name") or f.get("author") or ""
        is_reply = f.get("is_reply") or f.get("in_reply_to") or ""
        is_retweet = f.get("is_retweet") or f.get("retweeted") or ""

        entry = f"{i + 1}. {str(content)[:400]}"
        if timestamp:
            entry += f"\n   Time: {timestamp}"
        if likes:
            entry += f" | Likes: {likes}"
        if retweets:
            entry += f" | Retweets: {retweets}"
        if replies:
            entry += f" | Replies: {replies}"
        if author and str(author).lower() != username.lower():
            entry += f" | Author: {author}"
        if is_reply:
            entry += " | [Reply]"
        if is_retweet:
            entry += " | [Retweet]"
        tweet_entries.append(entry)

    retrieved_count = len(tweets.items)
    fewer_note = ""
    if retrieved_count < count:
        fewer_note = f"\nNote: {count} tweets were requested but only {retrieved_count} were retrieved. Mention this in the summary."

    return f"""Summarize recent Twitter/X activity for @{username}.

## Retrieved Data

**Tweets retrieved:** {retrieved_count} (via authenticated Sela Network session)
{fewer_note}

{chr(10).join(chr(10).join(['', e]) for e in tweet_entries)}

## Instructions

Based ONLY on the tweets above, produce an activity summary following the exact structure from your system prompt:
- Activity Summary header with @{username}
- "Retrieved N tweets via authenticated Sela Network session."
- Posting frequency
- Main topics (grouped by theme, specific not vague)
- Content breakdown (originals / replies / retweets / threads)
- Notable observations
- Engagement snapshot

RULES:
- Be factual. Do not interpret intent, mood, or sentiment.
- Be specific with topic descriptions.
- Group by topic, not chronology.
- Do not reproduce full tweet text.
- Do not expose private information.
- State that content was accessed via an authenticated Sela Network session."""
