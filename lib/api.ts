import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "@/lib/auth";

/**
 * Small helpers shared by the JSON API route handlers so every endpoint
 * validates auth and shapes errors the same way.
 */

/** Standard error envelope: `{ "error": "message" }` with the given status. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Resolve the current session or short-circuit with a 401.
 *
 * Returns a discriminated result so callers can write:
 *
 * ```ts
 * const auth = await requireSession();
 * if ("response" in auth) return auth.response;
 * // auth.userId is now a non-empty string
 * ```
 */
export async function requireSession(): Promise<
  { session: Session; userId: string } | { response: NextResponse }
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { response: jsonError("Unauthorized", 401) };
  }
  return { session, userId: session.user.id };
}
