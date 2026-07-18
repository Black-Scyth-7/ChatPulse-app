import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

/**
 * Home of the authenticated chat area (`/`). Rendered inside the app shell, so
 * the conversation list is already present alongside it.
 *
 * Desktop: this empty-state placeholder fills the chat pane until a conversation
 * is opened. Mobile: the chat pane is hidden here, so the full-screen list shows
 * instead (this content is simply off-screen).
 */
export default async function Home() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <h1 className="text-title font-semibold text-text">ChatPulse</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Select a conversation from the list to start chatting, or create a group
        to bring your team together.
      </p>
    </div>
  );
}
