--
-- Feed branches: the fork flag a writer sets on a block, the branch the store infers from it, and
-- one row for each branch so heads and walks read the branch tree without a scan of the blocks.
--
-- `blocks.fork` replicates with the block, in clear. `blocks.branch` is local: the store infers it on
-- insert (a fork block names its own branch, any other block the branch of its predecessor) and NULL
-- means the root branch. `branches.branchId` is '' for the root branch, since a key column cannot hold
-- NULL and still be unique. The table holds no foreign key, as `trimmed_blocks` does not: it is derived
-- from the blocks, and a wipe deletes `feeds` without knowing it exists.
--
-- Existing blocks have no fork flag, so they are all on the root branch; the root rows are backfilled.
--
-- Not idempotent, by design: `feed_migrations` guarantees it runs exactly once. Immutable once
-- shipped -- change the schema by adding the next numbered migration.
--
-- AlterTable
ALTER TABLE "blocks" ADD COLUMN "fork" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN "branch" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_blocks_feedPrivateId_branch" ON "blocks"("feedPrivateId", "branch", "insertionId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "branches" (
    "feedPrivateId" INTEGER NOT NULL,
    "branchId" TEXT NOT NULL,
    "baseBranchId" TEXT,
    "baseInsertionId" INTEGER NOT NULL,
    "forkInsertionId" INTEGER,
    "headInsertionId" INTEGER NOT NULL,
    "headSequence" INTEGER NOT NULL,
    "headActorId" TEXT NOT NULL,

    PRIMARY KEY ("feedPrivateId", "branchId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_branches_feedPrivateId_head" ON "branches"("feedPrivateId", "headInsertionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_branches_feedPrivateId_base" ON "branches"("feedPrivateId", "baseBranchId", "forkInsertionId");

-- Backfill
INSERT INTO "branches" (
    "feedPrivateId", "branchId", "baseBranchId", "baseInsertionId", "forkInsertionId",
    "headInsertionId", "headSequence", "headActorId"
)
SELECT
    "first"."feedPrivateId", '', NULL, "first"."insertionId", NULL,
    "head"."insertionId", "head"."sequence", "head"."actorId"
FROM (
    SELECT "feedPrivateId", MIN("insertionId") AS "insertionId", MAX("insertionId") AS "headId"
    FROM "blocks" GROUP BY "feedPrivateId"
) AS "first"
JOIN "blocks" AS "head" ON "head"."insertionId" = "first"."headId";
