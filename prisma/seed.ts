/**
 * ChatPulse dev seed.
 *
 * Produces a small but realistic dataset: a handful of users, a few channels
 * with memberships, some channel messages, and a DM conversation with history.
 * Idempotent — safe to re-run; it upserts users/channels by natural keys and
 * resets message/DM data each run.
 *
 * Run via `npm run db:seed` (configured in package.json `prisma.seed`).
 */
import { PrismaClient, ChannelMemberRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Minutes-ago helper for spreading timestamps across message history.
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  console.log("Seeding ChatPulse dev data…");

  // --- Users -------------------------------------------------------------
  const upsertUser = (u: {
    email: string;
    name: string;
    image: string;
    status: UserStatus;
  }) =>
    prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        image: u.image,
        status: u.status,
        lastSeen: new Date(),
      },
      create: {
        email: u.email,
        name: u.name,
        image: u.image,
        status: u.status,
        emailVerified: new Date(),
      },
    });

  const ada = await upsertUser({
    email: "ada@chatpulse.dev",
    name: "Ada Lovelace",
    image: "https://i.pravatar.cc/150?u=ada",
    status: UserStatus.ONLINE,
  });
  const grace = await upsertUser({
    email: "grace@chatpulse.dev",
    name: "Grace Hopper",
    image: "https://i.pravatar.cc/150?u=grace",
    status: UserStatus.AWAY,
  });
  const linus = await upsertUser({
    email: "linus@chatpulse.dev",
    name: "Linus Torvalds",
    image: "https://i.pravatar.cc/150?u=linus",
    status: UserStatus.OFFLINE,
  });
  const margaret = await upsertUser({
    email: "margaret@chatpulse.dev",
    name: "Margaret Hamilton",
    image: "https://i.pravatar.cc/150?u=margaret",
    status: UserStatus.ONLINE,
  });
  console.log("  4 users");

  // --- Channels ----------------------------------------------------------
  // Deterministic ids so re-runs update rather than duplicate.
  const generalId = "seed-channel-general";
  const engineeringId = "seed-channel-engineering";
  const randomId = "seed-channel-random";

  const general = await prisma.channel.upsert({
    where: { id: generalId },
    update: {},
    create: {
      id: generalId,
      name: "general",
      description: "Company-wide announcements and chatter.",
      isPrivate: false,
      createdById: ada.id,
    },
  });

  const engineering = await prisma.channel.upsert({
    where: { id: engineeringId },
    update: {},
    create: {
      id: engineeringId,
      name: "engineering",
      description: "Backend, frontend, infra — all things code.",
      isPrivate: false,
      createdById: grace.id,
    },
  });

  const random = await prisma.channel.upsert({
    where: { id: randomId },
    update: {},
    create: {
      id: randomId,
      name: "random",
      description: "Non-work banter.",
      isPrivate: false,
      createdById: linus.id,
    },
  });

  console.log("  3 channels");

  // --- Memberships -------------------------------------------------------
  const memberships: Array<{
    channelId: string;
    userId: string;
    role: ChannelMemberRole;
  }> = [
    { channelId: general.id, userId: ada.id, role: ChannelMemberRole.OWNER },
    { channelId: general.id, userId: grace.id, role: ChannelMemberRole.MEMBER },
    { channelId: general.id, userId: linus.id, role: ChannelMemberRole.MEMBER },
    { channelId: general.id, userId: margaret.id, role: ChannelMemberRole.MEMBER },
    { channelId: engineering.id, userId: grace.id, role: ChannelMemberRole.OWNER },
    { channelId: engineering.id, userId: ada.id, role: ChannelMemberRole.ADMIN },
    { channelId: engineering.id, userId: linus.id, role: ChannelMemberRole.MEMBER },
    { channelId: random.id, userId: linus.id, role: ChannelMemberRole.OWNER },
    { channelId: random.id, userId: margaret.id, role: ChannelMemberRole.MEMBER },
  ];

  await Promise.all(
    memberships.map((m) =>
      prisma.channelMember.upsert({
        where: {
          channelId_userId: { channelId: m.channelId, userId: m.userId },
        },
        update: { role: m.role },
        create: m,
      })
    )
  );

  console.log(`  ${memberships.length} channel memberships`);

  // --- Channel messages --------------------------------------------------
  // Reset message data so re-runs produce a clean, ordered history.
  await prisma.message.deleteMany({});

  const channelMessages = [
    {
      channelId: general.id,
      authorId: ada.id,
      body: "👋 Welcome to **ChatPulse**! This is the `#general` channel.",
      createdAt: minutesAgo(120),
    },
    {
      channelId: general.id,
      authorId: margaret.id,
      body: "Excited to be here! The dark theme looks great.",
      createdAt: minutesAgo(115),
    },
    {
      channelId: general.id,
      authorId: grace.id,
      body: "Reminder: standup at 10am. Bring your _blockers_.",
      createdAt: minutesAgo(90),
    },
    {
      channelId: engineering.id,
      authorId: grace.id,
      body: "Schema for messages is landing today. Indexes on `(channelId, createdAt)`.",
      createdAt: minutesAgo(60),
    },
    {
      channelId: engineering.id,
      authorId: ada.id,
      body: "Nice. Here's the plan:\n\n- [x] Prisma models\n- [x] Migration\n- [ ] Seed data",
      createdAt: minutesAgo(50),
      editedAt: minutesAgo(48),
    },
    {
      channelId: engineering.id,
      authorId: linus.id,
      body: "This message was removed.",
      createdAt: minutesAgo(45),
      deletedAt: minutesAgo(44),
    },
    {
      channelId: random.id,
      authorId: linus.id,
      body: "Anyone up for coffee? ☕",
      createdAt: minutesAgo(30),
    },
    {
      channelId: random.id,
      authorId: margaret.id,
      body: "Always.",
      createdAt: minutesAgo(28),
    },
  ];

  await prisma.message.createMany({ data: channelMessages });
  console.log(`  ${channelMessages.length} channel messages`);

  // --- Direct message conversation --------------------------------------
  const conversationId = "seed-dm-ada-grace";
  await prisma.directConversation.upsert({
    where: { id: conversationId },
    update: {},
    create: { id: conversationId },
  });

  await Promise.all(
    [ada, grace].map((u) =>
      prisma.directConversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId, userId: u.id },
        },
        update: {},
        create: {
          conversationId,
          userId: u.id,
          // Grace hasn't caught up — leaves an unread for the demo.
          lastReadAt: u.id === ada.id ? new Date() : minutesAgo(20),
        },
      })
    )
  );

  // Reset DM history so re-runs produce a clean, ordered conversation.
  await prisma.directMessage.deleteMany({ where: { conversationId } });

  const dmMessages = [
    {
      conversationId,
      authorId: grace.id,
      body: "Hey Ada — can you review the migration PR?",
      createdAt: minutesAgo(18),
    },
    {
      conversationId,
      authorId: ada.id,
      body: "On it. Looks solid so far. 👍",
      createdAt: minutesAgo(15),
    },
    {
      conversationId,
      authorId: grace.id,
      body: "Thanks! Ping me if anything's off.",
      createdAt: minutesAgo(12),
    },
  ];

  await prisma.directMessage.createMany({ data: dmMessages });
  console.log(`  1 DM conversation with ${dmMessages.length} messages`);

  console.log("Seed complete ✅");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
