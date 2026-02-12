"use client";

import { SearchIcon, SpinnerIcon, TwitterIcon, RedditIcon } from "./icons";

interface ToolInvocationProps {
  toolName: string;
  state: "pending" | "result" | "error";
  args?: Record<string, unknown>;
}

export function ToolInvocation({ toolName, state, args }: ToolInvocationProps) {
  const getToolDisplay = () => {
    switch (toolName) {
      case "sela_search_twitter":
        return {
          label: "Searching Twitter/X",
          icon: <TwitterIcon className="w-4 h-4" />,
          description: args?.query ? `"${args.query}"` : "Searching posts...",
        };
      case "sela_search_reddit":
        return {
          label: "Searching Reddit",
          icon: <RedditIcon className="w-4 h-4" />,
          description: args?.query ? `"${args.query}"` : "Searching posts...",
        };
      case "sela_browse":
        return {
          label: "Browsing page",
          icon: <SearchIcon className="w-4 h-4" />,
          description: args?.url ? `${args.url}` : "Loading content...",
        };
      case "analyze_sentiment":
        return {
          label: "Analyzing sentiment",
          icon: <SpinnerIcon className="w-4 h-4 animate-spin" />,
          description: "Processing collected posts...",
        };
      case "web_search_preview":
      case "web_search":
        return {
          label: "Searching the web",
          icon: <SearchIcon className="w-4 h-4" />,
          description: args?.query ? `"${args.query}"` : "Finding information...",
        };
      default:
        return {
          label: `Using ${toolName}`,
          icon: <SpinnerIcon className="w-4 h-4 animate-spin" />,
          description: "Processing...",
        };
    }
  };

  const { label, icon, description } = getToolDisplay();
  const isPending = state === "pending";

  return (
    <div className="flex items-center gap-2 py-2 px-3 my-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
      <div className={`text-blue-600 dark:text-blue-400 ${isPending ? "animate-pulse" : ""}`}>
        {isPending ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div className="flex-1">
        <span className="font-medium text-blue-700 dark:text-blue-300">
          {label}
          {isPending && "..."}
        </span>
        {description && (
          <span className="ml-2 text-blue-600/70 dark:text-blue-400/70">
            {description}
          </span>
        )}
      </div>
      {state === "result" && (
        <span className="text-green-600 dark:text-green-400 text-xs">Done</span>
      )}
      {state === "error" && (
        <span className="text-red-600 dark:text-red-400 text-xs">Failed</span>
      )}
    </div>
  );
}
