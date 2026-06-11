-- AlterTable: add isOpen flag and ownerId FK to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN "ownerId" TEXT;

-- CreateIndex: unique constraint on Restaurant.ownerId (one restaurant per owner)
CREATE UNIQUE INDEX "Restaurant_ownerId_key" ON "Restaurant"("ownerId");

-- AddForeignKey: Restaurant.ownerId -> User.id
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add category column to MenuItem
ALTER TABLE "MenuItem" ADD COLUMN "category" TEXT;
