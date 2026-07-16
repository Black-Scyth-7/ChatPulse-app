import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DirectMessageView } from "@/components/chat/DirectMessageView";

/**
 * Direct-message route. Resolves the session server-side (route protection also
 * runs in middleware; this is a defensive fallback) and hands the current user
 * plus the conversation id to the client DM view.
 */
export default async function DirectMessagePage({
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
    <DirectMessageView
      conversationId={id}
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
