/**
 * Core types for the says-so-agent application.
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredData {
  conversations: Conversation[];
  activeConversationId: string | null;
}

export interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/** Activity log entry for the Sela browsing panel */
export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: "search" | "browse" | "error" | "info";
  platform: "twitter" | "reddit" | "system";
  message: string;
  url?: string;
  details?: string;
}
