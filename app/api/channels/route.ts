import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { createChannelSchema } from "@/lib/validators/channel";
import type { ChannelSummary } from "@/lib/types";

/**
 * GET /api/channels — list the channels the current user is a member of, with
 * a member count, the user's own role, and the count of unread messages in
 * each (messages authored by others after the user's lastReadAt).
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const channels = await prisma.channel.findMany({
    where: { members: { some: { userId: auth.userId } } },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { userId: auth.userId },
        select: { role: true, lastReadAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Unread = messages created after the member's lastReadAt, excluding their
  // own messages and soft-deleted ones. Counted per channel in parallel.
  const unreadCounts = await Promise.all(
    channels.map((c) => {
      const lastReadAt = c.members[0]?.lastReadAt ?? new Date(0);
      return prisma.message.count({
        where: {
          channelId: c.id,
          deletedAt: null,
          authorId: { not: auth.userId },
          createdAt: { gt: lastReadAt },
        },
      });
    }),
  );

  const result: ChannelSummary[] = channels.map((c, i) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isPrivate: c.isPrivate,
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    memberCount: c._count.members,
    role: c.members[0]?.role,
    unreadCount: unreadCounts[i] ?? 0,
  }));

  return NextResponse.json({ channels: result });
}

/**
 * POST /api/channels — create a channel. The creator is recorded as OWNER and
 * added as the first member. Channel names must be unique (409 on conflict).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, description, isPrivate } = parsed.data;

  const existing = await prisma.channel.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) {
    return jsonError("A channel with that name already exists", 409);
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      description,
      isPrivate,
      createdById: auth.userId,
      members: { create: { userId: auth.userId, role: "OWNER" } },
    },
    include: { _count: { select: { members: true } } },
  });

  const result: ChannelSummary = {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    isPrivate: channel.isPrivate,
    createdById: channel.createdById,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
    memberCount: channel._count.members,
    role: "OWNER",
    unreadCount: 0,
  };

  return NextResponse.json({ channel: result }, { status: 201 });
}
