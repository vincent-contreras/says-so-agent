"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import { UserIcon, BotIcon } from "./icons";
import { ToolInvocation } from "./tool-invocation";
import { Sources } from "./sources";

interface MessagePart {
  type: string;
  text?: string;
  toolInvocation?: {
    toolName: string;
    state: string;
    args?: Record<string, unknown>;
  };
}

interface ToolInvocationData {
  toolName: string;
  state: string;
  args?: Record<string, unknown>;
}

interface Source {
  sourceType?: string;
  id?: string;
  url?: string;
  title?: string;
}

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  parts?: MessagePart[];
  toolInvocations?: ToolInvocationData[];
  sources?: Source[];
}

export function Message({ role, content, parts, toolInvocations, sources }: MessageProps) {
  const isUser = role === "user";

  const renderToolInvocations = () => {
    if (!toolInvocations || toolInvocations.length === 0) return null;

    return toolInvocations.map((invocation, index) => {
      const state = ["pending", "result", "error"].includes(invocation.state)
        ? (invocation.state as "pending" | "result" | "error")
        : "pending";

      return (
        <ToolInvocation
          key={index}
          toolName={invocation.toolName}
          state={state}
          args={invocation.args}
        />
      );
    });
  };

  const renderContent = () => {
    if (isUser) {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    if (parts && parts.length > 0) {
      return parts.map((part, index) => {
        if (part.type === "text" && part.text) {
          return (
            <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          );
        }
        if (part.type === "tool-invocation" && part.toolInvocation) {
          const state = ["pending", "result", "error"].includes(part.toolInvocation.state)
            ? (part.toolInvocation.state as "pending" | "result" | "error")
            : "pending";
          return (
            <ToolInvocation
              key={index}
              toolName={part.toolInvocation.toolName}
              state={state}
              args={part.toolInvocation.args}
            />
          );
        }
        return null;
      });
    }

    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  };

  return (
    <div
      className={clsx(
        "flex gap-3 px-4 py-6",
        isUser ? "bg-transparent" : "bg-gray-50 dark:bg-gray-900"
      )}
    >
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-emerald-600 text-white"
        )}
      >
        {isUser ? (
          <UserIcon className="w-5 h-5" />
        ) : (
          <BotIcon className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-1">
          {isUser ? "You" : "Says So Agent"}
        </div>
        {!isUser && renderToolInvocations()}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-lg">
          {renderContent()}
        </div>
        {!isUser && sources && <Sources sources={sources} />}
      </div>
    </div>
  );
}
