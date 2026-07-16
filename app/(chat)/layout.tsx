import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { AppShell } from "@/components/sidebar/AppShell";

/**
 * Layout for the authenticated chat area. Resolves the session server-side and
 * renders the app shell (sidebar + main). Route protection also runs in
 * middleware; this redirect is a defensive fallback.
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
