--
-- Feed indexing and retention options, and what retention needs to run.
--
-- `feeds.options` holds a feed's `FeedOptions` as JSON; NULL means the defaults (indexing on,
-- nothing trimmed), so existing rows stay valid with no backfill.
--
-- `idx_blocks_feedPrivateId_timestamp` lets trimming and hiding by `maxAge` find a feed's expired
-- blocks without scanning the feed.
--
-- `trimmed_blocks` logs every block retention deletes, in the same transaction, so a reader that
-- derives state from blocks (the indexer) can remove what was trimmed even across a restart.
--
-- Not idempotent, by design: `feed_migrations` guarantees it runs exactly once. Immutable once
-- shipped -- change the schema by adding the next numbered migration.
--
-- AlterTable
ALTER TABLE "feeds" ADD COLUMN "options" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_blocks_feedPrivateId_timestamp" ON "blocks"("feedPrivateId", "timestamp");

-- CreateTable
CREATE TABLE IF NOT EXISTS "trimmed_blocks" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "feedPrivateId" INTEGER NOT NULL,
    "insertionId" INTEGER NOT NULL,
    "position" INTEGER
);
