-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationMode" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "pushToken" TEXT,
ADD COLUMN     "pushTokenUpdatedAt" TIMESTAMP(3);

