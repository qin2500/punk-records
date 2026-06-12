-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "CardSource" AS ENUM ('DISCORD', 'WEBAPP');

-- CreateTable
CREATE TABLE "Collage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "collageId" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogSiteName" TEXT,
    "ogFavicon" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 280,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "source" "CardSource" NOT NULL,
    "discordMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collage_discordChannelId_key" ON "Collage"("discordChannelId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_collageId_fkey" FOREIGN KEY ("collageId") REFERENCES "Collage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
