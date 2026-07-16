import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { presenceUpdateSchema } from "@/lib/validators/presence";
import { broadcastPresence, toUserStatus } from "@/lib/presence";

/**
 * PATCH /api/users/me — set the current user's presence.
 *
 * Body: `{ status: "online" | "away" | "offline" }`. Updates `User.status` and
 * bumps `User.lastSeen`, then broadcasts `presence:changed` to every connected
 * client through the live Socket.io server so other users see the change without
 * polling. The broadcast is a no-op if the realtime server isn't running.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = presenceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { status } = parsed.data;

  await prisma.user.update({
    where: { id: auth.userId },
    data: { status: toUserStatus(status), lastSeen: new Date() },
  });

  broadcastPresence(auth.userId, status);

  return NextResponse.json({ userId: auth.userId, status });
}
