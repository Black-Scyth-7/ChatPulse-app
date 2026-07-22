"use client";

import { apiUrl } from "@/lib/apiBase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ChannelSummary, ConversationListItem } from "@/lib/types";
import type {
  SerializedDirectMessage,
  SerializedMessage,
} from "@/lib/socket-events";
import { useSocket } from "@/lib/useSocket";
import { getDesktop } from "@/lib/desktop";
import {
  playNotificationSound,
  shouldNotify,
  showNotification,
} from "@/lib/notifications";
import { useNotificationSettings } from "@/lib/useNotificationSettings";
import { registerPushNotifications, updatePushMode } from "@/lib/mobilePush";

/**
 * Client-side store for the unified WhatsApp-style conversation list — channels
 * and DMs interleaved by most-recent activity. Fetched once from
 * `GET /api/conversations` and kept live: `message:new` / `dm:new` refresh a
 * row's last-message preview, bump its unread badge (unless it's the open
 * conversation), and float it to the top; `channel:invited` / `channel:deleted`
 * add and remove channel rows.
 *
 * Opening a conversation clears its unread badge locally and persists the read
 * marker via the matching `…/read` endpoint, so returning later doesn't
 * re-surface those messages.
 */

type LoadStatus = "loading" | "ready" | "error";

/** Max characters in a live-updated preview (mirrors the API's PREVIEW_MAX). */
const PREVIEW_MAX = 100;

function truncate(body: string): string {
  return body.length > PREVIEW_MAX ? `${body.slice(0, PREVIEW_MAX)}…` : body;
}

/** Parse the active conversation (`/channel/[id]` or `/dm/[id]`) from the path. */
function activeFromPath(
  pathname: string,
): { type: "channel" | "dm"; id: string } | null {
  const channel = pathname.match(/^\/channel\/([^/]+)/);
  if (channel?.[1]) return { type: "channel", id: channel[1] };
  const dm = pathname.match(/^\/dm\/([^/]+)/);
  if (dm?.[1]) return { type: "dm", id: dm[1] };
  return null;
}

interface ConversationsContextValue {
  conversations: ConversationListItem[];
  status: LoadStatus;
  /** Refetch the list (used by the error-state retry button). */
  reload: () => void;
}

const ConversationsContext =
  createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: React.ReactNode;
}) {
  const { on, off } = useSocket();
  const router = useRouter();
  const { mode } = useNotificationSettings();
  // Read the current notification mode inside socket handlers without making
  // them (and their socket subscriptions) depend on it.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  // Mirror of `conversations` for synchronous reads inside socket handlers,
  // since a `setConversations` updater doesn't run at the call site.
  const conversationsRef = useRef<ConversationListItem[]>([]);
  conversationsRef.current = conversations;
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadNonce, setReloadNonce] = useState(0);
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  }, []);

  const pathname = usePathname();
  const active = activeFromPath(pathname);
  // Read the active conversation inside socket handlers without resubscribing.
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/conversations"));
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data: { conversations?: ConversationListItem[] } =
          await res.json();
        if (cancelled) return;
        setConversations(data.conversations ?? []);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  // Fold a fresh message into its conversation: update the preview, bump unread
  // for rows that aren't currently open, and move the row to the top.
  const applyMessage = useCallback(
    (
      type: "channel" | "dm",
      convId: string,
      author: { id: string; name: string | null; image: string | null },
      body: string,
      createdAt: string,
    ) => {
      const isOwn = author.id === currentUserId;
      const isActive =
        activeRef.current?.type === type && activeRef.current.id === convId;
      // The conversation the user is actively looking at: open *and* the window
      // focused. Anything else is "non-focused" and eligible for a notification.
      const conversationFocused =
        isActive &&
        typeof document !== "undefined" &&
        document.hasFocus();

      // Decide notification eligibility from the current snapshot (read via ref
      // so it doesn't depend on the async setConversations updater below).
      const known = conversationsRef.current.find(
        (c) => c.type === type && c.id === convId,
      );

      setConversations((prev) => {
        const existing = prev.find(
          (c) => c.type === type && c.id === convId,
        );
        if (!existing) return prev; // not in this user's list
        const updated: ConversationListItem = {
          ...existing,
          lastMessage: {
            content: truncate(body),
            senderName: author.name ?? "Unknown",
            timestamp: createdAt,
            status: null,
            isOwn,
          },
          // Own messages and the open conversation never accrue unread.
          unreadCount:
            isOwn || isActive ? 0 : existing.unreadCount + 1,
        };
        return [
          updated,
          ...prev.filter((c) => !(c.type === type && c.id === convId)),
        ];
      });

      // Notify for messages from others in a conversation the user isn't
      // actively watching, subject to the mute/DM-only preference.
      if (
        known &&
        !isOwn &&
        !conversationFocused &&
        shouldNotify(modeRef.current, type)
      ) {
        const senderName = author.name ?? "Someone";
        const title =
          type === "dm" ? senderName : `#${known.name} — ${senderName}`;
        const navigatePath =
          type === "dm" ? `/dm/${convId}` : `/channel/${convId}`;
        showNotification({
          title,
          body: truncate(body),
          icon: author.image ?? undefined,
          navigatePath,
          onActivate: (path) => router.push(path),
        });
        playNotificationSound();
      }
    },
    [currentUserId, router],
  );

  useEffect(() => {
    const onMessage = (msg: SerializedMessage) =>
      applyMessage(
        "channel",
        msg.channelId,
        msg.author,
        msg.body,
        msg.createdAt,
      );
    const onDm = (msg: SerializedDirectMessage) =>
      applyMessage("dm", msg.conversationId, msg.author, msg.body, msg.createdAt);
    on("message:new", onMessage);
    on("dm:new", onDm);
    return () => {
      off("message:new", onMessage);
      off("dm:new", onDm);
    };
  }, [on, off, applyMessage]);

  // Clicking a native (Electron) notification navigates to its conversation.
  // The main process focuses the window and forwards the route here.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    const unsubscribe = desktop.onActivate((navigatePath) => {
      router.push(navigatePath);
    });
    return unsubscribe;
  }, [router]);

  // On the Android app (remote webview): register for FCM push notifications
  // after auth, and navigate to the tapped conversation. No-op on web/desktop.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void registerPushNotifications({
      onNavigate: (path) => router.push(path),
    }).then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [router]);

  // Keep the server's copy of the notification mode in sync so offline pushes
  // honour a muted / DMs-only choice made on the device.
  useEffect(() => {
    updatePushMode(mode);
  }, [mode]);

  // A channel the user was just added to: prepend it (no refetch needed).
  useEffect(() => {
    const onInvited = ({ channel }: { channel: ChannelSummary }) => {
      setConversations((prev) =>
        prev.some((c) => c.type === "channel" && c.id === channel.id)
          ? prev
          : [
              {
                id: channel.id,
                type: "channel",
                name: channel.name,
                image: null,
                lastMessage: null,
                unreadCount: channel.unreadCount ?? 0,
                isOnline: null,
                otherUserId: null,
              },
              ...prev,
            ],
      );
    };
    on("channel:invited", onInvited);
    return () => {
      off("channel:invited", onInvited);
    };
  }, [on, off]);

  // A channel was deleted by its owner: drop it from the list.
  useEffect(() => {
    const onDeleted = ({ channelId }: { channelId: string }) => {
      setConversations((prev) =>
        prev.filter((c) => !(c.type === "channel" && c.id === channelId)),
      );
    };
    on("channel:deleted", onDeleted);
    return () => {
      off("channel:deleted", onDeleted);
    };
  }, [on, off]);

  // Opening a conversation clears its badge and persists the read marker.
  useEffect(() => {
    if (!active) return;
    setConversations((prev) =>
      prev.some(
        (c) => c.type === active.type && c.id === active.id && c.unreadCount > 0,
      )
        ? prev.map((c) =>
            c.type === active.type && c.id === active.id
              ? { ...c, unreadCount: 0 }
              : c,
          )
        : prev,
    );
    const path =
      active.type === "channel"
        ? `/api/channels/${active.id}/read`
        : `/api/dm/${active.id}/read`;
    void fetch(apiUrl(path), { method: "POST" }).catch(() => {});
    // `active` is a fresh object each render; depend on its primitive fields so
    // this only fires when the open conversation actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.type, active?.id]);

  return (
    <ConversationsContext.Provider value={{ conversations, status, reload }}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) {
    throw new Error(
      "useConversations must be used within a <ConversationsProvider>",
    );
  }
  return ctx;
}
