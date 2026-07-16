import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import type { MessagesPage } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Parse the `limit` query param, clamping to [1, MAX_LIMIT] and falling back to
 * DEFAULT_LIMIT when absent or non-numeric.
 */
function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/**
 * GET /api/channels/[id]/messages — paginated message history, newest first.
 *
 *  - Only members of the channel may read its messages (403 otherwise).
 *  - Soft-deleted messages (deletedAt != null) are excluded.
 *  - Cursor pagination: `cursor` is a message id; results start strictly after
 *    it in newest-first order. `nextCursor` is the id to pass to fetch the next
 *    (older) page, or null when the history is exhausted.
 */
export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseLimit(searchParams.get("limit"));

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: auth.userId } },
    select: { id: true },
  });
  if (!membership) {
    return jsonError("You are not a member of this channel", 403);
  }

  // Fetch one extra row to detect whether a further page exists.
  const rows = await prisma.message.findMany({
    where: { channelId: id, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  const result: MessagesPage = {
    messages: page.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      authorId: m.authorId,
      body: m.body,
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      author: {
        id: m.author.id,
        name: m.author.name,
        email: m.author.email,
        image: m.author.image,
      },
    })),
    nextCursor: hasMore && last ? last.id : null,
  };

  return NextResponse.json(result);
}
