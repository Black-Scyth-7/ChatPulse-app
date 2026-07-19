"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PresenceProvider } from "@/lib/usePresence";
import { NotificationSettingsProvider } from "@/lib/useNotificationSettings";
import {
  ConversationList,
  type ConversationListUser,
} from "@/components/conversations/ConversationList";
import { ConversationsProvider } from "@/components/conversations/ConversationsProvider";
import { ChannelsProvider } from "./ChannelsProvider";
import { DMConversationsProvider } from "./DMConversationsProvider";
import { QuickSwitcher } from "./QuickSwitcher";

/**
 * App shell for the authenticated chat area: a WhatsApp-style two-pane layout.
 *
 * Desktop (`md`+): the conversation list (30%) and the chat view (70%) sit side
 * by side, both always visible.
 *
 * Mobile: one pane at a time. With no conversation open, the list fills the
 * screen; opening a channel/DM swaps in the chat view (the header's back arrow
 * returns to the list). Whether a conversation is "open" is derived from the
 * route (`/channel/[id]` or `/dm/[id]`).
 *
 * `ChannelsProvider` + `DMConversationsProvider` still back the chat views
 * (channel detail, DM header presence), while `ConversationsProvider` owns the
 * unified list. All share one socket + presence context.
 */
export function AppShell({
  currentUserId,
  user,
  children,
}: {
  currentUserId: string;
  user: ConversationListUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasActiveConversation =
    /^\/channel\/[^/]+/.test(pathname) || /^\/dm\/[^/]+/.test(pathname);

  return (
    <ChannelsProvider currentUserId={currentUserId}>
      <DMConversationsProvider>
        <PresenceProvider>
          <NotificationSettingsProvider>
            <ConversationsProvider currentUserId={currentUserId}>
              <div className="flex h-screen w-screen overflow-hidden bg-bg font-sans text-text">
                <ConversationList
                  user={user}
                  className={cn(
                    "w-full md:w-list",
                    // Mobile: hidden while a chat is open. Desktop: always shown.
                    hasActiveConversation ? "hidden md:flex" : "flex",
                  )}
                />
                <main
                  className={cn(
                    "min-w-0 flex-1 flex-col",
                    // Mobile: shown only when a chat is open. Desktop: always shown.
                    hasActiveConversation ? "flex" : "hidden md:flex",
                  )}
                >
                  {children}
                </main>
              </div>
              <QuickSwitcher />
            </ConversationsProvider>
          </NotificationSettingsProvider>
        </PresenceProvider>
      </DMConversationsProvider>
    </ChannelsProvider>
  );
}
