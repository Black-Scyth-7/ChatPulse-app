import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import type { ChannelSummary } from "@/lib/types";

/**
 * GET /api/channels/discover — list public channels the current user has not
 * joined yet, so they can discover and join them.
 *
 * This static segment takes precedence over the dynamic `[id]` route, so a
 * request to `/api/channels/discover` never collides with channel-by-id.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const channels = await prisma.channel.findMany({
    where: {
      isPrivate: false,
      members: { none: { userId: auth.userId } },
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });

  const result: ChannelSummary[] = channels.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isPrivate: c.isPrivate,
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    memberCount: c._count.members,
    // Not joined yet, so there is nothing to have read/unread.
    unreadCount: 0,
  }));

  return NextResponse.json({ channels: result });
}
