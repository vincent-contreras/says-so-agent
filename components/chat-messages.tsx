"use client";

import { useEffect, useRef } from "react";
import { Message } from "./message";
import { TypingIndicator, BotIcon } from "./icons";
import type { Message as MessageType } from "@/lib/types";

interface DisplayMessage extends MessageType {
  toolInvocations?: Array<{
    toolName: string;
    state: string;
    args?: Record<string, unknown>;
  }>;
  parts?: Array<{
    type: string;
    text?: string;
  }>;
  sources?: Array<{
    sourceType?: string;
    id?: string;
    url?: string;
    title?: string;
  }>;
}

interface ChatMessagesProps {
  messages: DisplayMessage[];
  isLoading?: boolean;
  status?: string;
}

export function ChatMessages({ messages, isLoading, status }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">
            Says So Agent
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            I look up Twitter/X users and summarize their recent tweeting
            activity via authenticated Sela Network sessions.
          </p>
          <div className="mt-6 space-y-2 text-sm text-gray-500 dark:text-gray-500">
            <p>Try asking:</p>
            <ul className="space-y-1">
              <li>&quot;@elonmusk&quot;</li>
              <li>&quot;What has @sama been tweeting about?&quot;</li>
              <li>&quot;Summarize @levelsio&apos;s recent tweets&quot;</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          content={message.content}
          toolInvocations={message.toolInvocations}
          parts={message.parts}
          sources={message.sources}
        />
      ))}
      {isLoading && (
        <div className="flex gap-3 px-4 py-6 bg-gray-50 dark:bg-gray-900">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-600 text-white">
            <BotIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm mb-1">Says So Agent</div>
            <div className="flex items-center gap-2 text-gray-500">
              <TypingIndicator className="text-emerald-600" />
              <span className="text-sm">
                {status === "searching" ? "Fetching tweets..." : "Summarizing activity..."}
              </span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
