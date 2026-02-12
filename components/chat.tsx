"use client";

import { useState, useCallback } from "react";
import { useChat } from "ai/react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { Sidebar } from "./sidebar";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ActivityLog, ActivityLogToggle } from "./activity-log";
import { MenuIcon } from "./icons";
import type { ActivityLogEntry } from "@/lib/types";

export function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoaded,
    createConversation,
    setActiveConversation,
    addMessage,
    deleteConversation,
  } = useLocalStorage();

  const initialMessages = activeConversation?.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  })) || [];

  const {
    messages: streamMessages,
    isLoading,
    status,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    initialMessages,
    id: activeConversationId || undefined,
    onFinish: (message) => {
      if (activeConversationId) {
        addMessage(activeConversationId, {
          role: "assistant",
          content: message.content,
        });
      }
    },
    onResponse: (response) => {
      // Parse activity log entries from custom header
      const logHeader = response.headers.get("x-activity-log");
      if (logHeader) {
        try {
          const entries: ActivityLogEntry[] = JSON.parse(logHeader).map(
            (e: ActivityLogEntry) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })
          );
          setActivityEntries((prev) => [...prev, ...entries]);
        } catch {
          // Ignore parse errors
        }
      }
    },
  });

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversation(id);
      const conversation = conversations.find((c) => c.id === id);
      if (conversation) {
        setMessages(
          conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
      setActivityEntries([]);
      setSidebarOpen(false);
    },
    [conversations, setActiveConversation, setMessages]
  );

  const handleNewChat = useCallback(() => {
    createConversation();
    setMessages([]);
    setActivityEntries([]);
    setSidebarOpen(false);
  }, [createConversation, setMessages]);

  const handleSubmit = useCallback(
    async (content: string) => {
      let convId = activeConversationId;
      if (!convId) {
        const newConv = createConversation();
        convId = newConv.id;
      }

      addMessage(convId, { role: "user", content });
      await append({ role: "user", content });
    },
    [activeConversationId, createConversation, addMessage, append]
  );

  const displayMessages =
    streamMessages.length > 0
      ? streamMessages.map((m) => {
          const extendedMessage = m as unknown as {
            toolInvocations?: Array<{ toolName: string; state: string; args?: Record<string, unknown> }>;
            parts?: Array<{ type: string; text?: string }>;
            sources?: Array<{ sourceType?: string; id?: string; url?: string; title?: string }>;
          };
          return {
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: new Date(),
            toolInvocations: extendedMessage.toolInvocations,
            parts: extendedMessage.parts,
            sources: extendedMessage.sources,
          };
        })
      : activeConversation?.messages || [];

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Says So Agent</h1>
          <div className="ml-auto">
            <ActivityLogToggle
              count={activityEntries.length}
              onClick={() => setActivityLogOpen(true)}
            />
          </div>
        </header>

        <ChatMessages messages={displayMessages} isLoading={isLoading} status={status} />
        <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Activity log panel */}
      <ActivityLog
        entries={activityEntries}
        isOpen={activityLogOpen}
        onClose={() => setActivityLogOpen(false)}
      />
    </div>
  );
}
