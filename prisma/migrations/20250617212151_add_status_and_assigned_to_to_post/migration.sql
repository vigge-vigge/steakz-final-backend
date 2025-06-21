-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'pending';
