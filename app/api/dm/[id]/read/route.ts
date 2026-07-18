import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { broadcastDmRead } from "@/lib/presence";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dm/[id]/read — mark a DM conversation read for the current user.
 *
 * Mirrors the channel read route: bumps DirectConversationParticipant.lastReadAt
 * (backs DM unread counts), flips every message authored by the other
 * participant to status READ, and broadcasts `dm:read` so the author's client
 * updates its check marks in real time.
 *
 * Only participants may mark a conversation read (403 otherwise). DMs don't use
 * MessageReadReceipt rows — the status field carries the receipt, since a
 * conversation has a single other participant.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const participation = await prisma.directConversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: auth.userId } },
    select: { id: true },
  });
  if (!participation) {
    return jsonError("You are not a participant in this conversation", 403);
  }

  const now = new Date();
  await prisma.directConversationParticipant.update({
    where: { id: participation.id },
    data: { lastReadAt: now },
  });

  await prisma.directMessage.updateMany({
    where: {
      conversationId: id,
      authorId: { not: auth.userId },
      deletedAt: null,
      status: { not: "READ" },
    },
    data: { status: "READ" },
  });

  // Newest non-deleted message; the author flips their own messages up to it.
  const latest = await prisma.directMessage.findFirst({
    where: { conversationId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    broadcastDmRead(id, auth.userId, latest.id);
  }

  return NextResponse.json({ lastReadAt: now.toISOString() });
}
