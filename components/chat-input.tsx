"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { SendIcon, SpinnerIcon } from "./icons";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading && !disabled) {
      onSubmit(trimmed);
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = isLoading || disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 dark:border-gray-800 p-4"
    >
      {isLoading && (
        <div className="max-w-3xl mx-auto mb-3">
          <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Fetching tweets..." : "Enter a Twitter/X username to look up..."}
            disabled={isDisabled}
            rows={1}
            className={`w-full resize-none rounded-lg border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isDisabled
                ? "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed"
                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isDisabled}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <SpinnerIcon className="w-5 h-5 animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">
        {isLoading ? "Fetching tweets from Twitter/X..." : "Press Enter to send, Shift+Enter for new line"}
      </p>
    </form>
  );
}
