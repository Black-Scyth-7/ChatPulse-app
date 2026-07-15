/**
 * ChatPulse dev seed.
 *
 * Produces a small but realistic dataset per CHAA-6:
 *   - 5 users (realistic names + emails)
 *   - 3 channels: #general, #random, #engineering
 *   - all 5 users are members of #general
 *   - 20 messages in #general spread across the users
 *   - 1 DM conversation between user 1 and user 2 with 5 messages
 *
 * Idempotent — safe to re-run: users/channels are upserted by natural keys and
 * message/DM data is reset each run so history stays clean and ordered.
 *
 * Run via `pnpm prisma db seed` (configured in package.json `prisma.seed`).
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
  const alan = await upsertUser({
    email: "alan@chatpulse.dev",
    name: "Alan Turing",
    image: "https://i.pravatar.cc/150?u=alan",
    status: UserStatus.ONLINE,
  });
  console.log("  5 users");

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
  // All 5 users belong to #general; the other channels get a subset.
  const memberships: Array<{
    channelId: string;
    userId: string;
    role: ChannelMemberRole;
  }> = [
    { channelId: general.id, userId: ada.id, role: ChannelMemberRole.OWNER },
    { channelId: general.id, userId: grace.id, role: ChannelMemberRole.MEMBER },
    { channelId: general.id, userId: linus.id, role: ChannelMemberRole.MEMBER },
    { channelId: general.id, userId: margaret.id, role: ChannelMemberRole.MEMBER },
    { channelId: general.id, userId: alan.id, role: ChannelMemberRole.MEMBER },
    { channelId: engineering.id, userId: grace.id, role: ChannelMemberRole.OWNER },
    { channelId: engineering.id, userId: ada.id, role: ChannelMemberRole.ADMIN },
    { channelId: engineering.id, userId: linus.id, role: ChannelMemberRole.MEMBER },
    { channelId: engineering.id, userId: alan.id, role: ChannelMemberRole.MEMBER },
    { channelId: random.id, userId: linus.id, role: ChannelMemberRole.OWNER },
    { channelId: random.id, userId: margaret.id, role: ChannelMemberRole.MEMBER },
    { channelId: random.id, userId: ada.id, role: ChannelMemberRole.MEMBER },
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

  // 20 messages in #general, spread across all 5 users and ordered by time.
  const generalAuthors = [ada, margaret, grace, linus, alan];
  const generalBodies = [
    "👋 Welcome to **ChatPulse**! This is the `#general` channel.",
    "Excited to be here! The dark theme looks great.",
    "Reminder: standup at 10am. Bring your _blockers_.",
    "Morning all ☀️ — coffee machine on floor 3 is fixed.",
    "Who's presenting at the demo this Friday?",
    "I can take the demo. Working on the realtime presence widget.",
    "Nice — the online/away/offline dots look slick.",
    "Docs update: the API reference now covers the `messages` endpoints.",
    "Heads up: deploy window is 2–3pm today.",
    "Lunch plans? Thinking tacos 🌮",
    "Tacos +1.",
    "Can someone review PR #42? Small change to the seed script.",
    "On it 👀",
    "Merged. Thanks for the quick turnaround!",
    "Reminder to fill out the Q3 survey by EOD.",
    "Done ✅",
    "The new `#engineering` channel is live for deep-dives.",
    "Great, moving the infra thread over there.",
    "Happy Friday, everyone! 🎉",
    "Have a great weekend all — see you Monday.",
  ];

  const generalMessages = generalBodies.map((body, i) => ({
    channelId: general.id,
    authorId: generalAuthors[i % generalAuthors.length].id,
    body,
    // Oldest first: message 0 is ~200 min ago, most recent ~10 min ago.
    createdAt: minutesAgo(200 - i * 10),
  }));

  // A few extra messages in the other channels for a realistic sidebar.
  const otherMessages = [
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

  await prisma.message.createMany({ data: [...generalMessages, ...otherMessages] });
  console.log(
    `  ${generalMessages.length} messages in #general (+${otherMessages.length} in other channels)`
  );

  // --- Direct message conversation --------------------------------------
  // 1 DM between user 1 (Ada) and user 2 (Grace) with 5 messages.
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
    {
      conversationId,
      authorId: ada.id,
      body: "One nit on the index naming, left a comment.",
      createdAt: minutesAgo(9),
    },
    {
      conversationId,
      authorId: grace.id,
      body: "Good catch — fixed and re-pushed. 🙌",
      createdAt: minutesAgo(6),
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
