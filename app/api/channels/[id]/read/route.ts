import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { broadcastMessageRead } from "@/lib/presence";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/channels/[id]/read — mark the channel read for the current user.
 *
 * Two effects, both keyed on "everything by other authors up to now":
 *  1. Bumps ChannelMember.lastReadAt to now, which backs the unread count
 *     (messages created after this timestamp are unread — see GET /api/channels).
 *  2. Flips those messages to status READ and records a MessageReadReceipt per
 *     message for this user, then broadcasts `message:read` so each author's
 *     client updates its WhatsApp-style check marks in real time.
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

  // Messages authored by others are the ones this user "reads"; you never mark
  // your own messages read. Grab their ids so we can both flip status and write
  // a receipt per message in one pass.
  const readable = await prisma.message.findMany({
    where: { channelId: id, authorId: { not: auth.userId }, deletedAt: null },
    select: { id: true },
  });

  if (readable.length > 0) {
    const ids = readable.map((m) => m.id);
    await prisma.$transaction([
      prisma.message.updateMany({
        where: { id: { in: ids }, status: { not: "READ" } },
        data: { status: "READ" },
      }),
      prisma.messageReadReceipt.createMany({
        data: ids.map((messageId) => ({ messageId, userId: auth.userId })),
        skipDuplicates: true,
      }),
    ]);
  }

  // `readUpTo` is the newest non-deleted message in the channel: authors flip
  // their own messages up to this point to READ. Null only for an empty channel.
  const latest = await prisma.message.findFirst({
    where: { channelId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    broadcastMessageRead(id, auth.userId, latest.id);
  }

  return NextResponse.json({ lastReadAt: now.toISOString() });
}
