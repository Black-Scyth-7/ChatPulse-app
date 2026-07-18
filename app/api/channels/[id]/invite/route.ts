import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { inviteSchema } from "@/lib/validators/invite";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/channels/[id]/invite — add a user to the channel as a MEMBER.
 *
 * Restricted to the channel's OWNER or ADMIN members.
 *  - 403 if the inviter isn't an OWNER/ADMIN of the channel.
 *  - 404 if the target user does not exist.
 *  - 409 if the target user is already a member.
 */
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId } = parsed.data;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: { where: { userId: auth.userId }, select: { role: true } },
    },
  });
  if (!channel) return jsonError("Channel not found", 404);

  const role = channel.members[0]?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return jsonError("Only an owner or admin can invite members", 403);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) return jsonError("User not found", 404);

  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId } },
    select: { id: true },
  });
  if (existing) {
    return jsonError("User is already a member of this channel", 409);
  }

  const member = await prisma.channelMember.create({
    data: { channelId: id, userId, role: "MEMBER" },
  });

  return NextResponse.json(
    {
      success: true,
      member: {
        id: member.id,
        channelId: member.channelId,
        userId: member.userId,
        role: member.role,
        lastReadAt: member.lastReadAt.toISOString(),
        joinedAt: member.joinedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
