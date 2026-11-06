--
-- Re-presents every feed block so `objectMeta.queueBranch` (entity-meta 0012) is filled: the column is
-- written only when a block's row is rewritten, so without this an item appended to a branch before the
-- upgrade would read as main and a branch-scoped query would miss it. Only the snapshot leg is reset,
-- since that leg rewrites the meta row; reverse references do not depend on the branch.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE sourceName = 'queue' AND indexName = 'objectSnapshot';
