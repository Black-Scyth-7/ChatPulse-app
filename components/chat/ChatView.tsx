"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChannelDetail, UserSummary } from "@/lib/types";
import { useChatMessages } from "@/lib/useChatMessages";
import { useSocket } from "@/lib/useSocket";
import { usePresence } from "@/lib/usePresence";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useChannels } from "@/components/sidebar/ChannelsProvider";
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
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const { channels, removeChannel } = useChannels();
  const { emit } = useSocket();
  const { getStatus } = usePresence();
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    reload,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useChatMessages(channelId, currentUser);

  // Page title: "ChatPulse — #general" once the channel name resolves.
  useDocumentTitle(channel ? `#${channel.name}` : null);

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

  // The current user's role, used to gate the leave action (owners can't leave).
  const myRole = useMemo(
    () =>
      channel?.members.find((m) => m.userId === currentUser.id)?.role ?? null,
    [channel, currentUser.id],
  );

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    setLeaveError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/leave`, {
        method: "POST",
      });
      if (res.ok) {
        // Pick a channel to land on before dropping this one from the list.
        const next = channels.find((c) => c.id !== channelId);
        removeChannel(channelId);
        router.push(next ? `/channel/${next.id}` : "/");
        return;
      }
      const data: { error?: string } = await res.json().catch(() => ({}));
      setLeaveError(data.error ?? "Couldn't leave the channel. Please try again.");
    } catch {
      setLeaveError("Network error. Please try again.");
    } finally {
      setLeaving(false);
    }
  }, [channelId, channels, removeChannel, router]);

  const handleDelete = useCallback(async () => {
    if (
      !window.confirm(
        "Delete this channel? This removes it and all its messages for every member, and can't be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Drop it locally and navigate away; the channel:deleted broadcast does
        // the same for every other member's sidebar.
        const next = channels.find((c) => c.id !== channelId);
        removeChannel(channelId);
        router.push(next ? `/channel/${next.id}` : "/");
        return;
      }
      const data: { error?: string } = await res.json().catch(() => ({}));
      setDeleteError(
        data.error ?? "Couldn't delete the channel. Please try again.",
      );
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [channelId, channels, removeChannel, router]);

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
        onLeave={channel ? handleLeave : undefined}
        canLeave={myRole !== "OWNER"}
        leaving={leaving}
        onDelete={channel && myRole === "OWNER" ? handleDelete : undefined}
        deleting={deleting}
      />
      {(leaveError || deleteError) && (
        <p
          role="alert"
          className="border-b border-border bg-danger-muted px-4 py-2 text-sm text-danger"
        >
          {leaveError ?? deleteError}
        </p>
      )}
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
        onRetry={reload}
      />
      <TypingIndicator
        channelId={channelId}
        currentUserId={currentUser.id}
        resolveName={resolveName}
      />
      <MessageInput
        channelName={channel?.name ?? ""}
        focusKey={channelId}
        onSend={sendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
}
