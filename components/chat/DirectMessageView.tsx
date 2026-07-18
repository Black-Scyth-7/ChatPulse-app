"use client";

import { useCallback, useMemo } from "react";
import type { UserSummary } from "@/lib/types";
import { useDirectMessages } from "@/lib/useDirectMessages";
import { usePresence } from "@/lib/usePresence";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useDMConversations } from "@/components/sidebar/DMConversationsProvider";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

/**
 * The full direct-message view: header (other participant + live presence) +
 * scrolling message list + composer. Reuses the channel MessageList/MessageItem/
 * MessageInput, and delegates message state/realtime to `useDirectMessages`
 * (which speaks `dm:send` / `dm:new`). DMs have no edit/delete or typing
 * signals, so those affordances are disabled.
 */
export function DirectMessageView({
  conversationId,
  currentUser,
}: {
  conversationId: string;
  currentUser: UserSummary;
}) {
  const { getConversation, status: listStatus } = useDMConversations();
  const conversation = getConversation(conversationId);
  const other = conversation?.otherUser ?? null;

  const { getStatus } = usePresence();
  const presence = other ? getStatus(other.id) : "offline";

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    reload,
    loadOlder,
    sendMessage,
  } = useDirectMessages(conversationId, currentUser);

  const noop = useCallback(() => {}, []);
  const composerName = useMemo(
    () => other?.name ?? other?.email ?? "user",
    [other],
  );

  // Page title: "ChatPulse — DM with Ada" once the participant resolves.
  useDocumentTitle(other ? `DM with ${composerName}` : null);

  // Conversation isn't in the loaded list and the list has settled — most
  // likely an id that doesn't belong to this user (or was never created).
  if (listStatus === "ready" && !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-base font-medium text-text">
          Conversation not found.
        </p>
        <p className="text-sm text-text-muted">
          Pick a conversation from the sidebar or start a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader variant="dm" user={other} status={presence} />
      <MessageList
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        currentUserId={currentUser.id}
        canModify={false}
        onEdit={noop}
        onDelete={noop}
        loadOlder={loadOlder}
        onRetry={reload}
      />
      <ChatInput
        placeholder={`Message ${composerName}`}
        focusKey={conversationId}
        onSend={sendMessage}
        onTypingStart={noop}
        onTypingStop={noop}
      />
    </div>
  );
}
