import { NextResponse } from "next/server";
import type { MessageStatus as PrismaMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import type {
  ConversationListItem,
  ConversationLastMessage,
  MessageStatusWire,
} from "@/lib/types";

/** Max characters shown in a sidebar last-message preview. */
const PREVIEW_MAX = 100;

/** Truncate a message body for the list preview, appending an ellipsis. */
function truncate(body: string): string {
  return body.length > PREVIEW_MAX ? `${body.slice(0, PREVIEW_MAX)}…` : body;
}

/** DB enum (UPPERCASE) → wire status (lowercase). */
function toWireStatus(status: PrismaMessageStatus): MessageStatusWire {
  return status.toLowerCase() as MessageStatusWire;
}

/**
 * GET /api/conversations — the unified WhatsApp-style list combining the current
 * user's channels and DM conversations, sorted by most recent message
 * (descending). Each item carries a truncated last-message preview, the unread
 * count, and — for DMs only — the other participant's online status. `status` on
 * the preview is present only for messages the requesting user sent (their own
 * read receipt).
 *
 * A conversation with no messages sorts by its creation time so freshly-created
 * channels/DMs still appear (at the bottom, below anything with activity).
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const me = auth.userId;

  const [channels, conversations] = await Promise.all([
    prisma.channel.findMany({
      where: { members: { some: { userId: me } } },
      include: {
        members: {
          where: { userId: me },
          select: { lastReadAt: true },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            body: true,
            authorId: true,
            status: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    }),
    prisma.directConversation.findMany({
      where: { participants: { some: { userId: me } } },
      include: {
        // All participants: we pick out the other user for display and my own
        // row for lastReadAt (a 1:1 conversation has exactly the two).
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: { select: { id: true, name: true, image: true, status: true } },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            body: true,
            authorId: true,
            status: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // Unread = non-deleted messages authored by someone else after my lastReadAt.
  // Counted per conversation in parallel, mirroring GET /api/channels.
  const [channelUnread, dmUnread] = await Promise.all([
    Promise.all(
      channels.map((c) =>
        prisma.message.count({
          where: {
            channelId: c.id,
            deletedAt: null,
            authorId: { not: me },
            createdAt: { gt: c.members[0]?.lastReadAt ?? new Date(0) },
          },
        }),
      ),
    ),
    Promise.all(
      conversations.map((c) => {
        // My own participant row carries my lastReadAt (already loaded above).
        const mine = c.participants.find((p) => p.userId === me);
        return prisma.directMessage.count({
          where: {
            conversationId: c.id,
            deletedAt: null,
            authorId: { not: me },
            createdAt: { gt: mine?.lastReadAt ?? new Date(0) },
          },
        });
      }),
    ),
  ]);

  // Build a common shape with a sort key so channels and DMs interleave.
  type Entry = { item: ConversationListItem; sortAt: number };
  const entries: Entry[] = [];

  channels.forEach((c, i) => {
    const last = c.messages[0];
    const lastMessage: ConversationLastMessage | null = last
      ? {
          content: truncate(last.body),
          senderName: last.author.name ?? "Unknown",
          timestamp: last.createdAt.toISOString(),
          // Status is meaningful only for my own messages' read receipts.
          status: last.authorId === me ? toWireStatus(last.status) : null,
        }
      : null;
    entries.push({
      item: {
        id: c.id,
        type: "channel",
        name: c.name,
        image: null, // Channels have no icon in the data model.
        lastMessage,
        unreadCount: channelUnread[i] ?? 0,
        isOnline: null, // Online status is a DM-only concept.
      },
      sortAt: (last?.createdAt ?? c.createdAt).getTime(),
    });
  });

  conversations.forEach((c, i) => {
    const other = c.participants.find((p) => p.userId !== me)?.user ?? null;
    const last = c.messages[0];
    const lastMessage: ConversationLastMessage | null = last
      ? {
          content: truncate(last.body),
          senderName: last.author.name ?? "Unknown",
          timestamp: last.createdAt.toISOString(),
          status: last.authorId === me ? toWireStatus(last.status) : null,
        }
      : null;
    entries.push({
      item: {
        id: c.id,
        type: "dm",
        name: other?.name ?? "Unknown",
        image: other?.image ?? null,
        lastMessage,
        unreadCount: dmUnread[i] ?? 0,
        // Presence is DB-backed: anything but OFFLINE counts as online (see
        // GET /api/users/online). Null when the partner account is missing.
        isOnline: other ? other.status !== "OFFLINE" : null,
      },
      sortAt: (last?.createdAt ?? c.createdAt).getTime(),
    });
  });

  entries.sort((a, b) => b.sortAt - a.sortAt);

  return NextResponse.json({ conversations: entries.map((e) => e.item) });
}
