import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ChatView } from "@/components/chat/ChatView";

/**
 * Channel chat route. Resolves the session server-side (route protection also
 * runs in middleware; this is a defensive fallback) and hands the current user
 * plus the channel id to the client chat view.
 */
export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <ChatView
      channelId={id}
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
