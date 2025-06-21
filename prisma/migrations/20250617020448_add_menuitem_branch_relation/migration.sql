/*
  Warnings:

  - A unique constraint covering the columns `[name,branchId]` on the table `MenuItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branchId` to the `MenuItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "branchId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_name_branchId_key" ON "MenuItem"("name", "branchId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
