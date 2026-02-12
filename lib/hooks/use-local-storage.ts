"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Message, StoredData } from "@/lib/types";

const STORAGE_KEY = "says-so-agent-chat";

function getDefaultData(): StoredData {
  return {
    conversations: [],
    activeConversationId: null,
  };
}

function parseStoredData(stored: string | null): StoredData {
  if (!stored) return getDefaultData();

  try {
    const parsed = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      Array.isArray(parsed.conversations)
    ) {
      parsed.conversations = parsed.conversations.map((conv: Conversation) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })),
      }));
      return parsed as StoredData;
    }
  } catch (e) {
    console.error("Failed to parse stored chat data:", e);
  }

  return getDefaultData();
}

export function useLocalStorage() {
  const [data, setData] = useState<StoredData>(getDefaultData);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setData(parseStoredData(stored));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const activeConversation = data.conversations.find(
    (c) => c.id === data.activeConversationId
  ) || null;

  const createConversation = useCallback((): Conversation => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setData((prev) => ({
      conversations: [newConversation, ...prev.conversations],
      activeConversationId: newConversation.id,
    }));

    return newConversation;
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    setData((prev) => ({
      ...prev,
      activeConversationId: id,
    }));
  }, []);

  const addMessage = useCallback(
    (conversationId: string, message: Omit<Message, "id" | "createdAt">) => {
      const newMessage: Message = {
        ...message,
        id: uuidv4(),
        createdAt: new Date(),
      };

      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;

          let title = conv.title;
          if (conv.messages.length === 0 && message.role === "user") {
            title = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
          }

          return {
            ...conv,
            title,
            messages: [...conv.messages, newMessage],
            updatedAt: new Date(),
          };
        }),
      }));

      return newMessage;
    },
    []
  );

  const deleteConversation = useCallback((id: string) => {
    setData((prev) => {
      const filtered = prev.conversations.filter((c) => c.id !== id);
      return {
        conversations: filtered,
        activeConversationId:
          prev.activeConversationId === id
            ? filtered[0]?.id || null
            : prev.activeConversationId,
      };
    });
  }, []);

  return {
    conversations: data.conversations,
    activeConversation,
    activeConversationId: data.activeConversationId,
    isLoaded,
    createConversation,
    setActiveConversation,
    addMessage,
    deleteConversation,
  };
}
