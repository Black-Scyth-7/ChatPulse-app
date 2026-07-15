-- CHAA-5 restructures direct messaging (the mission data model): the former
-- DirectMessage "conversation" table becomes a per-message table, DM
-- participants move to DirectConversationParticipant, and channel Messages
-- become channel-only (channelId NOT NULL). Clear the incompatible legacy rows
-- (dev/seed data only) so the NOT NULL columns and constraints below apply
-- cleanly. Delete children (DM messages) before parents to respect FKs; data is
-- re-created by prisma/seed.ts.
DELETE FROM "Message" WHERE "channelId" IS NULL;
DELETE FROM "DirectMessage";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ONLINE', 'OFFLINE', 'AWAY');

-- CreateEnum
CREATE TYPE "ChannelMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_directMessageId_fkey";

-- DropForeignKey
ALTER TABLE "DirectMessageParticipant" DROP CONSTRAINT "DirectMessageParticipant_directMessageId_fkey";

-- DropForeignKey
ALTER TABLE "DirectMessageParticipant" DROP CONSTRAINT "DirectMessageParticipant_userId_fkey";

-- DropIndex
DROP INDEX "User_presence_idx";

-- DropIndex
DROP INDEX "Message_directMessageId_createdAt_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "presence",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'OFFLINE';

-- AlterTable
ALTER TABLE "ChannelMember" DROP COLUMN "role",
ADD COLUMN     "role" "ChannelMemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "directMessageId",
DROP COLUMN "isDeleted",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "channelId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "DirectMessageParticipant";

-- DropEnum
DROP TYPE "PresenceStatus";

-- DropEnum
DROP TYPE "ChannelRole";

-- CreateTable
CREATE TABLE "DirectConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectConversationParticipant_userId_idx" ON "DirectConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "DirectConversationParticipant_conversationId_idx" ON "DirectConversationParticipant"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectConversationParticipant_conversationId_userId_key" ON "DirectConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_authorId_idx" ON "DirectMessage"("authorId");

-- AddForeignKey
ALTER TABLE "DirectConversationParticipant" ADD CONSTRAINT "DirectConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectConversationParticipant" ADD CONSTRAINT "DirectConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

