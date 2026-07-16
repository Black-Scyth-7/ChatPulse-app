"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChannelDetail, UserSummary } from "@/lib/types";
import { useChatMessages } from "@/lib/useChatMessages";
import { useSocket } from "@/lib/useSocket";
import { usePresence } from "@/lib/usePresence";
import { ChannelHeader } from "./ChannelHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";

/**
 * The full channel chat view: header + scrolling message list + typing line +
 * composer. Loads channel detail for the header and member-name resolution,
 * and delegates message state/realtime to `useChatMessages`.
 */
export function ChatView({
  channelId,
  currentUser,
}: {
  channelId: string;
  currentUser: UserSummary;
}) {
  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const { emit } = useSocket();
  const { getStatus } = usePresence();
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useChatMessages(channelId, currentUser);

  // Load channel detail (header info + member roster for typing names).
  useEffect(() => {
    let cancelled = false;
    setChannel(null);
    setChannelError(null);
    (async () => {
      try {
        const res = await fetch(`/api/channels/${channelId}`);
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? "You are not a member of this channel."
              : res.status === 404
                ? "Channel not found."
                : `Failed to load channel (${res.status})`,
          );
        }
        const data: { channel: ChannelDetail } = await res.json();
        if (!cancelled) setChannel(data.channel);
      } catch (err) {
        if (!cancelled) {
          setChannelError(
            err instanceof Error ? err.message : "Failed to load channel",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of channel?.members ?? []) {
      map.set(m.userId, m.user.name ?? m.user.email ?? "Someone");
    }
    return map;
  }, [channel]);

  const resolveName = useCallback(
    (userId: string) => nameById.get(userId) ?? "Someone",
    [nameById],
  );

  // Members currently online or away (anyone not offline in the presence map).
  const onlineCount = useMemo(
    () =>
      (channel?.members ?? []).filter(
        (m) => getStatus(m.userId) !== "offline",
      ).length,
    [channel, getStatus],
  );

  const onTypingStart = useCallback(
    () => emit("typing:start", { channelId }),
    [emit, channelId],
  );
  const onTypingStop = useCallback(
    () => emit("typing:stop", { channelId }),
    [emit, channelId],
  );

  if (channelError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-base font-medium text-text">{channelError}</p>
        <p className="text-sm text-text-muted">
          Pick another channel from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChannelHeader
        name={channel?.name ?? "…"}
        description={channel?.description ?? null}
        memberCount={channel?.members.length ?? 0}
        onlineCount={channel ? onlineCount : undefined}
      />
      <MessageList
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        currentUserId={currentUser.id}
        onEdit={editMessage}
        onDelete={deleteMessage}
        loadOlder={loadOlder}
      />
      <TypingIndicator
        channelId={channelId}
        currentUserId={currentUser.id}
        resolveName={resolveName}
      />
      <MessageInput
        channelName={channel?.name ?? ""}
        onSend={sendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
}
