"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ChannelSummary } from "@/lib/types";
import type { SerializedMessage } from "@/lib/socket-events";
import { useSocket } from "@/lib/useSocket";

/**
 * Client-side store for the current user's channel list. Fetched once from
 * `GET /api/channels` and shared by every sidebar surface (desktop aside and
 * the mobile drawer) so we don't fetch the list twice.
 *
 * Also owns unread-count state. Each channel starts with the server's unread
 * count; a live `message:new` subscription increments the badge for channels
 * that aren't currently open, and navigating into a channel clears it (locally
 * and via `POST /api/channels/[id]/read`). While a channel is open, incoming
 * messages keep its server-side read marker fresh instead of piling up unread.
 */

type LoadStatus = "loading" | "ready" | "error";

/** Parse the active channel id out of the current pathname (`/channel/[id]`). */
function activeChannelFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/channel\/([^/]+)/);
  return match?.[1] ?? null;
}

interface ChannelsContextValue {
  channels: ChannelSummary[];
  status: LoadStatus;
  /** Append a newly created channel (no-op if already present). */
  addChannel: (channel: ChannelSummary) => void;
  /** Drop a channel from the list (e.g. after leaving) and clear its badge. */
  removeChannel: (channelId: string) => void;
  /** Current unread count for a channel (0 if unknown). */
  unreadFor: (channelId: string) => number;
  /** Sum of unread counts across the user's channels. */
  totalUnread: number;
  /** Clear a channel's badge and persist the read marker on the server. */
  markRead: (channelId: string) => void;
  /** Refetch the channel list (used by the error-state retry button). */
  reload: () => void;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

export function ChannelsProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: React.ReactNode;
}) {
  const { on, off } = useSocket();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [unread, setUnread] = useState<Record<string, number>>({});
  // Bump to force the channel-list fetch to re-run (retry after an error).
  const [reloadNonce, setReloadNonce] = useState(0);
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const activeChannelId = activeChannelFromPath(pathname);
  // Read the active channel from inside the socket handler without resubscribing.
  const activeRef = useRef<string | null>(activeChannelId);
  activeRef.current = activeChannelId;
  // Same trick for the channel list, so the delete handler can pick a channel to
  // fall back to without re-subscribing on every list change.
  const channelsRef = useRef<ChannelSummary[]>(channels);
  channelsRef.current = channels;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        if (!res.ok) throw new Error(`Failed to load channels (${res.status})`);
        const data: { channels?: ChannelSummary[] } = await res.json();
        if (cancelled) return;
        const list = data.channels ?? [];
        setChannels(list);
        setUnread(
          Object.fromEntries(list.map((c) => [c.id, c.unreadCount ?? 0])),
        );
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const addChannel = useCallback((channel: ChannelSummary) => {
    setChannels((prev) =>
      prev.some((c) => c.id === channel.id) ? prev : [...prev, channel],
    );
  }, []);

  const removeChannel = useCallback((channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setUnread((prev) => {
      if (!(channelId in prev)) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const markRead = useCallback((channelId: string) => {
    setUnread((prev) =>
      prev[channelId] ? { ...prev, [channelId]: 0 } : prev,
    );
    // Fire-and-forget: the badge is already cleared optimistically.
    void fetch(`/api/channels/${channelId}/read`, { method: "POST" }).catch(
      () => {},
    );
  }, []);

  // Opening a channel (or landing on it) clears its unread badge and persists
  // the read marker so returning later doesn't re-surface those messages.
  useEffect(() => {
    if (activeChannelId) markRead(activeChannelId);
  }, [activeChannelId, markRead]);

  // Live unread tracking. The socket only delivers `message:new` for channels
  // the user belongs to, so every event here is for a channel in their list.
  useEffect(() => {
    // Debounce read-marker writes for the channel being viewed, so a burst of
    // messages doesn't fire a POST per message.
    let activeReadTimer: ReturnType<typeof setTimeout> | null = null;

    const onNew = (msg: SerializedMessage) => {
      // Never count our own messages (they may echo from another tab).
      if (msg.author.id === currentUserId) return;

      if (msg.channelId === activeRef.current) {
        // Viewing this channel: keep the badge at 0 and refresh the server-side
        // read marker (debounced) so it doesn't go stale while we watch.
        if (activeReadTimer) clearTimeout(activeReadTimer);
        const channelId = msg.channelId;
        activeReadTimer = setTimeout(() => {
          void fetch(`/api/channels/${channelId}/read`, {
            method: "POST",
          }).catch(() => {});
        }, 750);
        return;
      }

      setUnread((prev) => ({
        ...prev,
        [msg.channelId]: (prev[msg.channelId] ?? 0) + 1,
      }));
    };

    on("message:new", onNew);
    return () => {
      off("message:new", onNew);
      if (activeReadTimer) clearTimeout(activeReadTimer);
    };
  }, [on, off, currentUserId]);

  // The user was invited to a channel: add it to the sidebar in real time (no
  // refresh) and seed its unread count so the badge tracks correctly.
  useEffect(() => {
    const onInvited = ({ channel }: { channel: ChannelSummary }) => {
      addChannel(channel);
      setUnread((prev) =>
        channel.id in prev
          ? prev
          : { ...prev, [channel.id]: channel.unreadCount ?? 0 },
      );
    };
    on("channel:invited", onInvited);
    return () => {
      off("channel:invited", onInvited);
    };
  }, [on, off, addChannel]);

  // A channel was deleted by its owner: drop it from every member's sidebar and,
  // if it's the one they're viewing, navigate them to another channel (or home).
  useEffect(() => {
    const onDeleted = ({ channelId }: { channelId: string }) => {
      if (activeRef.current === channelId) {
        const next = channelsRef.current.find((c) => c.id !== channelId);
        router.push(next ? `/channel/${next.id}` : "/");
      }
      removeChannel(channelId);
    };
    on("channel:deleted", onDeleted);
    return () => {
      off("channel:deleted", onDeleted);
    };
  }, [on, off, removeChannel, router]);

  const unreadFor = useCallback(
    (channelId: string) => unread[channelId] ?? 0,
    [unread],
  );

  // Total across the channels actually in the list, so stray entries can't leak
  // into the badge.
  const totalUnread = useMemo(
    () => channels.reduce((sum, c) => sum + (unread[c.id] ?? 0), 0),
    [channels, unread],
  );

  return (
    <ChannelsContext.Provider
      value={{
        channels,
        status,
        addChannel,
        removeChannel,
        unreadFor,
        totalUnread,
        markRead,
        reload,
      }}
    >
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels(): ChannelsContextValue {
  const ctx = useContext(ChannelsContext);
  if (!ctx) {
    throw new Error("useChannels must be used within a <ChannelsProvider>");
  }
  return ctx;
}
