"use client";

import { clsx } from "clsx";
import { ActivityIcon, TwitterIcon, RedditIcon, XIcon, SearchIcon } from "./icons";
import type { ActivityLogEntry } from "@/lib/types";

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

function PlatformIcon({ platform }: { platform: ActivityLogEntry["platform"] }) {
  switch (platform) {
    case "twitter":
      return <TwitterIcon className="w-4 h-4" />;
    case "reddit":
      return <RedditIcon className="w-4 h-4" />;
    default:
      return <ActivityIcon className="w-4 h-4" />;
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ActivityLog({ entries, isOpen, onClose }: ActivityLogProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed xl:static inset-y-0 right-0 z-50 w-80 bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-transform xl:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-sm">Activity Log</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors xl:hidden"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet.</p>
              <p className="text-xs mt-1">Searches and browsing will appear here.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={clsx(
                  "rounded-lg border p-3 text-xs",
                  entry.type === "error"
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <PlatformIcon platform={entry.platform} />
                  <span className={clsx(
                    "font-medium capitalize",
                    entry.type === "error" ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                  )}>
                    {entry.platform === "system" ? "System" : entry.platform}
                  </span>
                  <span className="ml-auto text-gray-400 dark:text-gray-600">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <p className={clsx(
                  entry.type === "error" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                )}>
                  {entry.message}
                </p>
                {entry.url && (
                  <p className="text-gray-400 dark:text-gray-600 truncate mt-1" title={entry.url}>
                    {entry.url}
                  </p>
                )}
                {entry.details && (
                  <p className="text-gray-500 dark:text-gray-500 mt-1 italic">
                    {entry.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
          <p>Showing Sela Network browsing activity.</p>
          <p>All content accessed via authenticated sessions.</p>
        </div>
      </aside>
    </>
  );
}

/** Small toggle button for opening the activity log */
export function ActivityLogToggle({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative"
      title="Activity log"
    >
      <ActivityIcon className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
