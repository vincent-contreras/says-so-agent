"use client";

import { clsx } from "clsx";
import { PlusIcon, TrashIcon, XIcon } from "./icons";
import type { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="font-semibold text-lg">Chats</h1>
          <div className="flex gap-2">
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="New chat"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors lg:hidden"
              title="Close sidebar"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">
              No conversations yet
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectConversation(conversation.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onSelectConversation(conversation.id);
                      }
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 group transition-colors cursor-pointer",
                      conversation.id === activeConversationId
                        ? "bg-gray-200 dark:bg-gray-800"
                        : "hover:bg-gray-200 dark:hover:bg-gray-800"
                    )}
                  >
                    <span className="flex-1 truncate text-sm">
                      {conversation.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-opacity"
                      title="Delete conversation"
                    >
                      <TrashIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
          <p>Conversations stored locally in your browser.</p>
        </div>
      </aside>
    </>
  );
}
