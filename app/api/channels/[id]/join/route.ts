import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/channels/[id]/join — join a public channel as a MEMBER.
 *
 *  - Private channels are join-by-invite only, so a join attempt returns 403.
 *  - Joining a channel you already belong to returns 409.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: { id: true, isPrivate: true },
  });
  if (!channel) return jsonError("Channel not found", 404);

  if (channel.isPrivate) {
    return jsonError("This channel is private", 403);
  }

  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: auth.userId } },
    select: { id: true },
  });
  if (existing) {
    return jsonError("You are already a member of this channel", 409);
  }

  const member = await prisma.channelMember.create({
    data: { channelId: id, userId: auth.userId, role: "MEMBER" },
  });

  return NextResponse.json(
    {
      membership: {
        channelId: member.channelId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
