"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/socket-events";
import type { UserSummary } from "@/lib/types";
import { useDirectMessages } from "@/lib/useDirectMessages";
import { useSocket } from "@/lib/useSocket";
import { useDMConversations } from "@/components/sidebar/DMConversationsProvider";
import { Avatar } from "./Avatar";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

/** Presence dot colour + label for the header status line. */
const PRESENCE: Record<PresenceStatus, { dot: string; label: string }> = {
  online: { dot: "bg-success", label: "Online" },
  away: { dot: "bg-warning", label: "Away" },
  offline: { dot: "bg-offline", label: "Offline" },
};

function DirectMessageHeader({
  other,
  status,
}: {
  other: UserSummary | null;
  status: PresenceStatus;
}) {
  const name = other?.name ?? other?.email ?? "Direct message";
  const presence = PRESENCE[status];
  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border px-4">
      {other ? (
        <span className="relative shrink-0">
          <Avatar user={other} className="h-avatar w-avatar" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface",
              presence.dot,
            )}
          />
        </span>
      ) : null}
      <div className="min-w-0">
        <h1 className="truncate text-md font-semibold text-text">{name}</h1>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            aria-hidden="true"
            className={cn("h-2 w-2 rounded-full", presence.dot)}
          />
          {presence.label}
        </p>
      </div>
    </header>
  );
}

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

  const { on, off } = useSocket();
  const [presence, setPresence] = useState<PresenceStatus>("offline");

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadOlder,
    sendMessage,
  } = useDirectMessages(conversationId, currentUser);

  // Track the other participant's presence via the shared presence broadcast.
  useEffect(() => {
    setPresence("offline");
    if (!other) return;
    const onPresence = (data: { userId: string; status: PresenceStatus }) => {
      if (data.userId === other.id) setPresence(data.status);
    };
    on("presence:changed", onPresence);
    return () => {
      off("presence:changed", onPresence);
    };
  }, [other, on, off]);

  const noop = useCallback(() => {}, []);
  const composerName = useMemo(
    () => other?.name ?? other?.email ?? "user",
    [other],
  );

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
      <DirectMessageHeader other={other} status={presence} />
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
      />
      <MessageInput
        channelName={composerName}
        placeholder={`Message ${composerName}`}
        onSend={sendMessage}
        onTypingStart={noop}
        onTypingStop={noop}
      />
    </div>
  );
}
