import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/channels/[id]/leave — leave a channel.
 *
 *  - The OWNER cannot leave (403); they must delete the channel or (once
 *    supported) transfer ownership first.
 *  - Leaving a channel you are not in returns 404.
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
    select: { role: true },
  });
  if (!membership) {
    return jsonError("You are not a member of this channel", 404);
  }

  if (membership.role === "OWNER") {
    return jsonError("The owner cannot leave the channel", 403);
  }

  await prisma.channelMember.delete({
    where: { channelId_userId: { channelId: id, userId: auth.userId } },
  });

  return NextResponse.json({ success: true });
}
