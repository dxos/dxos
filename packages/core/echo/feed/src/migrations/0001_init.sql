--
-- Generated from prisma/schema.prisma by scripts/prisma-generate-sql.mjs, then maintained by hand.
--
-- `IF NOT EXISTS` is added deliberately. Prisma emits bare statements, which fail against a
-- database that already holds these tables — reachable when the baseline predicate does not fire,
-- e.g. a database left partly initialised by an earlier release.
--
-- Immutable from here on: it is recorded in `feed_migrations`, never re-run, and its checksum is
-- verified on every open. Add a new numbered migration instead of editing this one.
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
