"use client";

import { apiUrl } from "@/lib/apiBase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChannelDetail, UserSummary } from "@/lib/types";
import { useChatMessages } from "@/lib/useChatMessages";
import { useSocket } from "@/lib/useSocket";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useChannels } from "@/components/sidebar/ChannelsProvider";
import { ChatHeader } from "./ChatHeader";
import { InfoPanel } from "./InfoPanel";
import { InviteModal } from "./InviteModal";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const router = useRouter();
  const { channels, removeChannel } = useChannels();
  const { emit } = useSocket();
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
    retryMessage,
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
        const res = await fetch(apiUrl(`/api/channels/${channelId}`));
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

  // Member display names for the header preview, current user first as "You".
  const memberNames = useMemo(() => {
    const names: string[] = [];
    for (const m of channel?.members ?? []) {
      if (m.userId === currentUser.id) names.unshift("You");
      else names.push(m.user.name ?? m.user.email ?? "Someone");
    }
    return names;
  }, [channel, currentUser.id]);

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
      const res = await fetch(apiUrl(`/api/channels/${channelId}/leave`), {
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
      const res = await fetch(apiUrl(`/api/channels/${channelId}`), {
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

  // Action handlers shared by the header menu and the info panel, gated by role.
  const onInvite =
    channel && (myRole === "OWNER" || myRole === "ADMIN")
      ? () => setInviteOpen(true)
      : undefined;
  const onLeave = channel ? handleLeave : undefined;
  const canLeave = myRole !== "OWNER";
  const onDelete = channel && myRole === "OWNER" ? handleDelete : undefined;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        variant="channel"
        name={channel?.name ?? "…"}
        memberNames={memberNames}
        onOpenInfo={() => setInfoOpen(true)}
        onLeave={onLeave}
        canLeave={canLeave}
        leaving={leaving}
        onDelete={onDelete}
        deleting={deleting}
        onInvite={onInvite}
      />
      <InfoPanel
        variant="channel"
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        channel={channel}
        currentUserId={currentUser.id}
        onInvite={
          onInvite
            ? () => {
                setInfoOpen(false);
                setInviteOpen(true);
              }
            : undefined
        }
        onLeave={onLeave}
        canLeave={canLeave}
        leaving={leaving}
        onDelete={onDelete}
        deleting={deleting}
      />
      <InviteModal
        channelId={channelId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
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
        isGroup
        onEdit={editMessage}
        onDelete={deleteMessage}
        loadOlder={loadOlder}
        onRetry={reload}
        onRetryMessage={retryMessage}
      />
      <TypingIndicator
        channelId={channelId}
        currentUserId={currentUser.id}
        resolveName={resolveName}
      />
      <ChatInput
        focusKey={channelId}
        onSend={sendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
}
