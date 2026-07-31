--
-- Generated from prisma/schema.prisma by scripts/prisma-generate-sql.mjs. Do not edit.
--
-- Not a migration and never applied to a real database. This is the schema prisma currently
-- describes, kept so a test can assert that replaying the migrations reproduces it. Without it,
-- editing schema.prisma would silently diverge from the migration chain, since migrations are
-- frozen once written.
--
-- CreateTable
CREATE TABLE IF NOT EXISTS "feeds" (
    "feedPrivateId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "spaceId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "feedNamespace" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blocks" (
    "insertionId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedPrivateId" INTEGER NOT NULL,
    "position" INTEGER,
    "sequence" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "prevSequence" INTEGER,
    "prevActorId" TEXT,
    "timestamp" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    CONSTRAINT "blocks_feedPrivateId_fkey" FOREIGN KEY ("feedPrivateId") REFERENCES "feeds" ("feedPrivateId") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "subscriptionId" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" INTEGER NOT NULL,
    "feedPrivateIds" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cursor_tokens" (
    "spaceId" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sync_state" (
    "spaceId" TEXT NOT NULL,
    "feedNamespace" TEXT NOT NULL,
    "lastPulledPosition" INTEGER NOT NULL DEFAULT -1,

    PRIMARY KEY ("spaceId", "feedNamespace")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_feeds_spaceId_feedId" ON "feeds"("spaceId", "feedId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_blocks_feedPrivateId_position" ON "blocks"("feedPrivateId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_blocks_feedPrivateId_sequence_actorId" ON "blocks"("feedPrivateId", "sequence", "actorId");
