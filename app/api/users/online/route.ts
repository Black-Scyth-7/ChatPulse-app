import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { toPresenceStatus } from "@/lib/presence";
import type { PresenceStatus } from "@/lib/socket-events";

/**
 * GET /api/users/online — the presence roster.
 *
 * Returns `[{ userId, status }]` for every currently connected user. Presence is
 * DB-backed: the realtime server flips `User.status` to ONLINE on connect and to
 * OFFLINE after the disconnect grace period, so "connected" is simply "not
 * OFFLINE" (which also surfaces AWAY users). This keeps the roster correct even
 * across a server restart and avoids the API route having to reach into the
 * socket server's in-memory connection map.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const users = await prisma.user.findMany({
    where: { status: { not: "OFFLINE" } },
    select: { id: true, status: true },
  });

  const online: { userId: string; status: PresenceStatus }[] = users.map((u) => ({
    userId: u.id,
    status: toPresenceStatus(u.status),
  }));

  return NextResponse.json(online);
}
