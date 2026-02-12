"use client";

import { SearchIcon } from "./icons";

interface Source {
  sourceType?: string;
  id?: string;
  url?: string;
  title?: string;
}

interface SourcesProps {
  sources: Source[];
}

export function Sources({ sources }: SourcesProps) {
  if (!sources || sources.length === 0) return null;

  const urlSources = sources.filter((s) => s.sourceType === "url" && s.url);

  if (urlSources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        <SearchIcon className="w-4 h-4" />
        <span>Sources ({urlSources.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {urlSources.map((source, index) => (
          <a
            key={source.id || index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 transition-colors truncate max-w-xs"
            title={source.url}
          >
            <span className="truncate">{source.title || source.url}</span>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
