-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_managerId_fkey";

-- AlterTable
ALTER TABLE "Branch" ALTER COLUMN "managerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
