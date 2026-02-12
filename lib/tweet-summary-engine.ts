/**
 * Tweet summary engine — takes collected tweets from a user's profile
 * and produces a structured activity summary prompt for OpenAI.
 *
 * Output format (defined in AGENT.md):
 *   - Posting frequency
 *   - Main topics (grouped by theme)
 *   - Content breakdown (originals/replies/retweets)
 *   - Notable observations
 *   - Engagement snapshot
 */

import type { SelaUserTweetsResult } from "./sela-adapter";

export interface TweetSummaryInput {
  username: string;
  tweets: SelaUserTweetsResult;
  count: number;
}

/**
 * Build the user prompt that contains the collected tweet data for OpenAI to summarize.
 */
export function buildTweetSummaryPrompt(input: TweetSummaryInput): string {
  const { username, tweets, count } = input;

  if (tweets.error) {
    return `I tried to fetch tweets for @${username} but encountered an error: ${tweets.error}

Please respond with an appropriate error message based on the AGENT.md error handling rules.`;
  }

  if (tweets.items.length === 0) {
    return `I fetched @${username}'s profile but found no recent tweets.

Please respond with an appropriate message (e.g., "@${username} hasn't posted recently.").`;
  }

  const tweetEntries = tweets.items.map((item, i) => {
    const f = item.fields;
    const content = f.content || f.text || f.title || "";
    const likes = f.like_count || f.likes || "";
    const retweets = f.retweet_count || f.retweets || "";
    const replies = f.reply_count || f.replies || "";
    const timestamp = f.timestamp || f.date || f.time || "";
    const author = f.author_name || f.author || "";
    const isReply = f.is_reply || f.in_reply_to || "";
    const isRetweet = f.is_retweet || f.retweeted || "";

    let entry = `${i + 1}. ${String(content).slice(0, 400)}`;
    if (timestamp) entry += `\n   Time: ${timestamp}`;
    if (likes) entry += ` | Likes: ${likes}`;
    if (retweets) entry += ` | Retweets: ${retweets}`;
    if (replies) entry += ` | Replies: ${replies}`;
    if (author && String(author).toLowerCase() !== username.toLowerCase()) {
      entry += ` | Author: ${author}`;
    }
    if (isReply) entry += ` | [Reply]`;
    if (isRetweet) entry += ` | [Retweet]`;
    return entry;
  });

  const retrievedCount = tweets.items.length;
  const fewerNote = retrievedCount < count
    ? `\nNote: ${count} tweets were requested but only ${retrievedCount} were retrieved. Mention this in the summary.`
    : "";

  return `Summarize recent Twitter/X activity for @${username}.

## Retrieved Data

**Tweets retrieved:** ${retrievedCount} (via authenticated Sela Network session)
${fewerNote}

${tweetEntries.join("\n\n")}

## Instructions

Based ONLY on the tweets above, produce an activity summary following the exact structure from your system prompt:
- Activity Summary header with @${username}
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
- State that content was accessed via an authenticated Sela Network session.`;
}
