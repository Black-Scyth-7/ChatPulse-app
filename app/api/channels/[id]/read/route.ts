import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/channels/[id]/read — mark the channel read for the current user by
 * bumping their ChannelMember.lastReadAt to now. Everything created after this
 * timestamp counts as unread (see the unread count in GET /api/channels).
 *
 * Only members may mark a channel read (404 for non-members/unknown channels,
 * which keeps private channels indistinguishable from missing ones).
 */
export async function POST(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: auth.userId } },
    select: { id: true },
  });
  if (!membership) return jsonError("Channel not found", 404);

  const now = new Date();
  await prisma.channelMember.update({
    where: { id: membership.id },
    data: { lastReadAt: now },
  });

  return NextResponse.json({ lastReadAt: now.toISOString() });
}
