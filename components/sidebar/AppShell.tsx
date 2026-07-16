"use client";

import { PresenceProvider } from "@/lib/usePresence";
import { ChannelsProvider } from "./ChannelsProvider";
import { DMConversationsProvider } from "./DMConversationsProvider";
import { Sidebar, type SidebarUser } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";

/**
 * App shell for the authenticated chat area: fixed desktop sidebar + fluid main
 * column, with the sidebar collapsing to a mobile drawer below `md`. Wraps
 * everything in `ChannelsProvider` + `DMConversationsProvider` so both sidebar
 * surfaces (and the DM view) share one channel/DM fetch.
 */
export function AppShell({
  currentUserId,
  user,
  children,
}: {
  currentUserId: string;
  user: SidebarUser;
  children: React.ReactNode;
}) {
  return (
    <ChannelsProvider currentUserId={currentUserId}>
      <DMConversationsProvider>
        <PresenceProvider>
          <div className="flex h-screen w-screen overflow-hidden bg-bg font-sans text-text">
            {/* Desktop sidebar (hidden below md) */}
            <Sidebar user={user} className="hidden md:flex" />

            {/* Main column: mobile header/drawer + page content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileSidebar user={user} />
              <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
            </div>
          </div>
        </PresenceProvider>
      </DMConversationsProvider>
    </ChannelsProvider>
  );
}
