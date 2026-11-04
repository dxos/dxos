--
-- The feed branch an item belongs to (`org.dxos.key.feed-branch` in its `@meta`), denormalized out of
-- the indexed snapshot so a branch-scoped read filters in SQL, before its order and limit. Null for the
-- main branch and for automerge objects.
--
-- The index serves the bounded natural read of one branch: `WHERE spaceId = ? AND queueId = ? AND
-- queueBranch = ? ORDER BY objectId LIMIT ?` (or `queueBranch IS NULL` for main) walks it and stops at
-- the limit. A cursor read of one branch keeps the `(queueId, queuePosition)` seek with the branch as a
-- residual, since it reads only what follows the cursor.
--
-- Unconditional ALTER, as in 0004: this column has never shipped. Existing rows are filled by the
-- tracker's re-presentation of feed blocks (index_cursor 0011).
--
-- Immutable: recorded in `entity_meta_migrations` and never re-run.
--
ALTER TABLE objectMeta ADD COLUMN queueBranch TEXT;

CREATE INDEX IF NOT EXISTS idx_object_index_queueBranch ON objectMeta(spaceId, queueId, queueBranch, objectId);
