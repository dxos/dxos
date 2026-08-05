--
-- The feed store's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op.
--
-- `IF NOT EXISTS` on every CREATE is required, for exactly that reason: this migration runs against
-- databases that already hold these tables. `schema.test.ts` asserts it. Later migrations are
-- `ALTER`s and deliberately not idempotent — `feed_migrations` guarantees they run exactly once.
--
-- Immutable: recorded in `feed_migrations` and never re-run. Change the schema by adding the next
-- numbered migration and listing it in `index.ts`.
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
