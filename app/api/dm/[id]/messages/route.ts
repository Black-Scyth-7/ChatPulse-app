import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import type { DirectMessagesPage } from "@/lib/types";

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
 * GET /api/dm/[id]/messages — paginated DM history, newest first.
 *
 *  - Only participants of the conversation may read its messages (403 otherwise).
 *  - Soft-deleted messages (deletedAt != null) are excluded.
 *  - Cursor pagination mirrors the channel messages route: `cursor` is a message
 *    id; results start strictly after it in newest-first order. `nextCursor` is
 *    the id to fetch the next (older) page, or null when history is exhausted.
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

  const participation = await prisma.directConversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: auth.userId } },
    select: { id: true },
  });
  if (!participation) {
    return jsonError("You are not a participant in this conversation", 403);
  }

  // Fetch one extra row to detect whether a further page exists.
  const rows = await prisma.directMessage.findMany({
    where: { conversationId: id, deletedAt: null },
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

  const result: DirectMessagesPage = {
    messages: page.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
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
