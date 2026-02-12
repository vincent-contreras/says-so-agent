/**
 * Sela Network adapter — wraps @selanet/sdk for sentiment analysis browsing.
 *
 * Responsibilities:
 * - Singleton SelaClient lifecycle (create → start → discover → connect)
 * - sela_status(), sela_search(), sela_browse() operations
 * - Session reuse, timeout/error handling
 * - Activity log collection for the UI
 */

import { JsSelaClient as SelaClient } from "@selanet/sdk";
import type { ActivityLogEntry } from "./types";
import { v4 as uuidv4 } from "uuid";

// ── Types ────────────────────────────────────────────────────────

export interface SelaStatus {
  connected: boolean;
  agentPeerId: string | null;
  lastError: string | null;
  state: string;
}

export interface SelaSearchResult {
  platform: "twitter" | "reddit";
  items: SelaContentItem[];
  authenticated: boolean;
  error?: string;
}

export interface SelaUserTweetsResult {
  username: string;
  items: SelaContentItem[];
  authenticated: boolean;
  error?: string;
}

export interface SelaContentItem {
  contentType: string;
  fields: Record<string, unknown>;
  url?: string;
}

export interface SelaBrowseResult {
  pageType: string;
  content: string;
  authenticated: boolean;
  error?: string;
}

// ── Platform config ─────────────────────────────────────────────

/** Comma-separated list of enabled platforms. Defaults to "twitter". */
const ENABLED_PLATFORMS = (process.env.ENABLED_PLATFORMS || "twitter")
  .split(",")
  .map((p) => p.trim().toLowerCase());

export function isPlatformEnabled(platform: "twitter" | "reddit"): boolean {
  return ENABLED_PLATFORMS.includes(platform);
}

// ── Platform URL helpers ─────────────────────────────────────────

const TWITTER_SEARCH_URL = "https://x.com/search?q=";
const REDDIT_SEARCH_URL = "https://www.reddit.com/search/?q=";

function buildSearchUrl(platform: "twitter" | "reddit", query: string): string {
  const encoded = encodeURIComponent(query);
  if (platform === "twitter") {
    return `${TWITTER_SEARCH_URL}${encoded}&src=typed_query&f=top`;
  }
  return `${REDDIT_SEARCH_URL}${encoded}&sort=relevance&t=all`;
}

// ── Singleton adapter ────────────────────────────────────────────

let client: InstanceType<typeof SelaClient> | null = null;
let lastError: string | null = null;
let activityLog: ActivityLogEntry[] = [];

function log(
  type: ActivityLogEntry["type"],
  platform: ActivityLogEntry["platform"],
  message: string,
  url?: string,
  details?: string
) {
  const entry: ActivityLogEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    type,
    platform,
    message,
    url,
    details,
  };
  activityLog.push(entry);
  return entry;
}

export function getActivityLog(): ActivityLogEntry[] {
  return [...activityLog];
}

export function clearActivityLog(): void {
  activityLog = [];
}

// ── Initialization ───────────────────────────────────────────────

let clientInitPromise: Promise<InstanceType<typeof SelaClient>> | null = null;

async function ensureClient(): Promise<InstanceType<typeof SelaClient>> {
  // Fast path: client already running
  if (client) {
    const state = await client.state;
    if (state === "running") return client;

    // If client exists but is not running, try to restart
    if (state === "stopped" || state === "created") {
      try {
        await client.start();
        log("info", "system", "Sela client restarted");
        return client;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        log("error", "system", `Failed to restart Sela client: ${lastError}`);
        client = null;
      }
    }
  }

  // Prevent concurrent initialization — reuse in-flight promise
  if (clientInitPromise) {
    return clientInitPromise;
  }

  clientInitPromise = initializeClient();
  try {
    return await clientInitPromise;
  } finally {
    clientInitPromise = null;
  }
}

async function initializeClient(): Promise<InstanceType<typeof SelaClient>> {
  const apiKey = process.env.SELA_API_KEY;
  if (!apiKey) {
    throw new Error("SELA_API_KEY environment variable is not set");
  }

  try {
    client = await SelaClient.withApiKey(apiKey);

    client.on("connected", (event: { peerId?: string }) => {
      log("info", "system", `Connected to agent: ${event.peerId || "unknown"}`);
    });

    client.on("error", (event: { message?: string }) => {
      lastError = event.message || "Unknown error";
      log("error", "system", `Sela error: ${lastError}`);
    });

    client.on("disconnected", () => {
      log("info", "system", "Disconnected from agent");
    });

    await client.start();
    log("info", "system", "Sela client started, connected to P2P network");

    // Discover and connect to an agent
    const agents = await client.discoverAgents("web", {
      maxAgents: 5,
      timeoutMs: 15000,
    });

    if (agents.length === 0) {
      throw new Error("No agents with 'web' capability found on the network");
    }

    log("info", "system", `Discovered ${agents.length} agent(s)`);

    await client.connectToFirstAvailable(agents, 10000);
    log("info", "system", "Connected to first available agent");

    lastError = null;
    return client;
  } catch (err) {
    client = null;
    lastError = err instanceof Error ? err.message : String(err);
    log("error", "system", `Failed to initialize Sela: ${lastError}`);
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function sela_status(): Promise<SelaStatus> {
  try {
    if (!client) {
      return {
        connected: false,
        agentPeerId: null,
        lastError: lastError || "Client not initialized",
        state: "stopped",
      };
    }

    const state = await client.state;
    const connected = await client.isConnected;
    const agent = await client.connectedAgent();

    return {
      connected,
      agentPeerId: agent?.peerId || null,
      lastError,
      state,
    };
  } catch (err) {
    return {
      connected: false,
      agentPeerId: null,
      lastError: err instanceof Error ? err.message : String(err),
      state: "unknown",
    };
  }
}

export async function sela_search(params: {
  platform: "twitter" | "reddit";
  query: string;
  max_results?: number;
}): Promise<SelaSearchResult> {
  const { platform, query, max_results = 20 } = params;

  try {
    const selaClient = await ensureClient();
    const searchUrl = buildSearchUrl(platform, query);

    log("search", platform, `Searching for "${query}"`, searchUrl);

    const response = await selaClient.browse(searchUrl, {
      timeoutMs: 60000,
      count: max_results,
      parseOnly: true,
      apiKey: "dev_bypass_token", // Bypasses TokenManager; agent-node accepts any token in API_DEV_MODE
    });

    // Parse semantic content from the response
    let items: SelaContentItem[] = [];
    try {
      const parsed = JSON.parse(response.page.content);
      if (Array.isArray(parsed)) {
        items = parsed.map((item: Record<string, unknown>) => ({
          contentType: (item.content_type as string) || "post",
          fields: (item.fields as Record<string, unknown>) || item,
          url: (item.url as string) || undefined,
        }));
      }
    } catch {
      // If content is not JSON array, treat as single text block
      items = [{
        contentType: "raw",
        fields: { content: response.page.content },
      }];
    }

    log(
      "info",
      platform,
      `Found ${items.length} results for "${query}"`,
      searchUrl,
      `Page type: ${response.page.pageType}`
    );

    return {
      platform,
      items: items.slice(0, max_results),
      authenticated: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log("error", platform, `Search failed: ${errorMsg}`, undefined, query);

    return {
      platform,
      items: [],
      authenticated: false,
      error: errorMsg,
    };
  }
}

export async function sela_browse(params: {
  url: string;
  session_id?: string;
}): Promise<SelaBrowseResult> {
  const { url } = params;
  const platform = url.includes("x.com") || url.includes("twitter.com")
    ? "twitter"
    : url.includes("reddit.com")
      ? "reddit"
      : "system";

  try {
    const selaClient = await ensureClient();

    log("browse", platform as "twitter" | "reddit", `Browsing URL`, url);

    const response = await selaClient.browse(url, {
      timeoutMs: 60000,
      parseOnly: true,
      apiKey: "dev_bypass_token", // Bypasses TokenManager; agent-node accepts any token in API_DEV_MODE
    });

    log("info", platform as "twitter" | "reddit", `Page loaded: ${response.page.pageType}`, url);

    return {
      pageType: response.page.pageType,
      content: response.page.content,
      authenticated: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log("error", platform as "twitter" | "reddit", `Browse failed: ${errorMsg}`, url);

    return {
      pageType: "error",
      content: "",
      authenticated: false,
      error: errorMsg,
    };
  }
}

export async function sela_getUserTweets(params: {
  username: string;
  count?: number;
}): Promise<SelaUserTweetsResult> {
  const username = params.username.replace(/^@/, "");
  const count = params.count ?? 10;
  // Use Twitter search with "from:username" operator — the x_com schema only
  // supports the "search" page type, not profile pages.
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(`from:${username}`)}&src=typed_query&f=top`;

  try {
    const selaClient = await ensureClient();

    log("browse", "twitter", `Fetching tweets for @${username}`, searchUrl);

    const response = await selaClient.browse(searchUrl, {
      timeoutMs: 60000,
      count,
      parseOnly: true,
      apiKey: "dev_bypass_token",
    });

    let items: SelaContentItem[] = [];
    try {
      const parsed = JSON.parse(response.page.content);
      if (Array.isArray(parsed)) {
        items = parsed.map((item: Record<string, unknown>) => ({
          contentType: (item.content_type as string) || "tweet",
          fields: (item.fields as Record<string, unknown>) || item,
          url: (item.url as string) || undefined,
        }));
      }
    } catch {
      items = [{
        contentType: "raw",
        fields: { content: response.page.content },
      }];
    }

    log(
      "info",
      "twitter",
      `Retrieved ${items.length} tweets for @${username}`,
      searchUrl,
      `Page type: ${response.page.pageType}`
    );

    return {
      username,
      items: items.slice(0, count),
      authenticated: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log("error", "twitter", `Failed to fetch tweets for @${username}: ${errorMsg}`, searchUrl);

    return {
      username,
      items: [],
      authenticated: false,
      error: errorMsg,
    };
  }
}
