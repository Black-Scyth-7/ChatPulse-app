import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { createDmSchema } from "@/lib/validators/dm";
import type { DmConversationSummary } from "@/lib/types";

/**
 * GET /api/dm — list the current user's DM conversations, most recently active
 * first. Each entry carries the other participant (name/avatar) and a preview
 * of the last message so the sidebar can render without a second round trip.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const conversations = await prisma.directConversation.findMany({
    where: { participants: { some: { userId: auth.userId } } },
    include: {
      participants: {
        where: { userId: { not: auth.userId } },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          authorId: true,
          body: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result: DmConversationSummary[] = conversations.map((c) => {
    const other = c.participants[0]?.user ?? null;
    const last = c.messages[0];
    return {
      id: c.id,
      otherUser: other
        ? { id: other.id, name: other.name, email: other.email, image: other.image }
        : null,
      lastMessage: last
        ? {
            id: last.id,
            authorId: last.authorId,
            body: last.body,
            createdAt: last.createdAt.toISOString(),
          }
        : null,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ conversations: result });
}

/**
 * POST /api/dm — start a 1:1 conversation with another user, or return the
 * existing one if the two already share a conversation. Body: `{ userId }`.
 *
 * "Existing" means a conversation whose participant set is exactly the two
 * users, so repeated calls are idempotent and never create duplicates.
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

  const parsed = createDmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const otherUserId = parsed.data.userId;

  if (otherUserId === auth.userId) {
    return jsonError("You cannot start a DM with yourself", 400);
  }

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!other) {
    return jsonError("User not found", 404);
  }

  // A shared 1:1 conversation is one where both users participate and there are
  // no other participants. Find the pair-only conversation, if it exists.
  const existing = await prisma.directConversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: auth.userId } } },
        { participants: { some: { userId: otherUserId } } },
        { participants: { every: { userId: { in: [auth.userId, otherUserId] } } } },
      ],
    },
    select: { id: true, updatedAt: true },
  });

  if (existing) {
    const result: DmConversationSummary = {
      id: existing.id,
      otherUser: {
        id: other.id,
        name: other.name,
        email: other.email,
        image: other.image,
      },
      lastMessage: null,
      updatedAt: existing.updatedAt.toISOString(),
    };
    return NextResponse.json({ conversation: result });
  }

  const created = await prisma.directConversation.create({
    data: {
      participants: {
        create: [{ userId: auth.userId }, { userId: otherUserId }],
      },
    },
    select: { id: true, updatedAt: true },
  });

  const result: DmConversationSummary = {
    id: created.id,
    otherUser: {
      id: other.id,
      name: other.name,
      email: other.email,
      image: other.image,
    },
    lastMessage: null,
    updatedAt: created.updatedAt.toISOString(),
  };
  return NextResponse.json({ conversation: result }, { status: 201 });
}
