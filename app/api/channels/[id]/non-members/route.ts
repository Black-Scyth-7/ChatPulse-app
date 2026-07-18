import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/channels/[id]/non-members — list users who are NOT members of this
 * channel, so an invite modal knows who it can offer to add.
 *
 * Restricted to the channel's OWNER or ADMIN members (403 otherwise).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: { where: { userId: auth.userId }, select: { role: true } },
    },
  });
  if (!channel) return jsonError("Channel not found", 404);

  const role = channel.members[0]?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return jsonError("Only an owner or admin can view non-members", 403);
  }

  const users = await prisma.user.findMany({
    where: { channelMemberships: { none: { channelId: id } } },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  const result: UserSummary[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
  }));

  return NextResponse.json({ users: result });
}
