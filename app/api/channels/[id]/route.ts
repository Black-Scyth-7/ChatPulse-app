import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { updateChannelSchema } from "@/lib/validators/channel";
import type { ChannelDetail } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/channels/[id] — channel details plus the full member list. Only
 * members may view a channel (403 otherwise), which keeps private channels
 * hidden from non-members.
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
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!channel) return jsonError("Channel not found", 404);

  const isMember = channel.members.some((m) => m.userId === auth.userId);
  if (!isMember) return jsonError("You are not a member of this channel", 403);

  const result: ChannelDetail = {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    isPrivate: channel.isPrivate,
    createdById: channel.createdById,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
    members: channel.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      },
    })),
  };

  return NextResponse.json({ channel: result });
}

/**
 * PATCH /api/channels/[id] — update name and/or description. Restricted to the
 * channel's OWNER or ADMIN members. Renaming to a taken name returns 409.
 */
export async function PATCH(
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

  const parsed = updateChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: { members: { where: { userId: auth.userId }, select: { role: true } } },
  });
  if (!channel) return jsonError("Channel not found", 404);

  const role = channel.members[0]?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return jsonError("Only an owner or admin can update this channel", 403);
  }

  const { name, description } = parsed.data;

  if (name !== undefined && name !== channel.name) {
    const clash = await prisma.channel.findFirst({
      where: { name, id: { not: id } },
      select: { id: true },
    });
    if (clash) return jsonError("A channel with that name already exists", 409);
  }

  const updated = await prisma.channel.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  return NextResponse.json({
    channel: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPrivate: updated.isPrivate,
      createdById: updated.createdById,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

/**
 * DELETE /api/channels/[id] — delete a channel. Restricted to the OWNER.
 * Members and messages are removed via the schema's cascading deletes.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!channel) return jsonError("Channel not found", 404);

  if (channel.createdById !== auth.userId) {
    return jsonError("Only the owner can delete this channel", 403);
  }

  await prisma.channel.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
