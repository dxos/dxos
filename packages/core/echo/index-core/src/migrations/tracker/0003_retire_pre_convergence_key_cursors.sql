--
-- Retire the cursor names used before `objectMeta.convergenceKey` existed. Renaming an index is the
-- invalidation mechanism: rows indexed under the old names hold NULL where a convergence key may exist
-- in the document, and re-indexing is per-object, so duplicate detection would silently miss them
-- forever. The bumped names (`fts6`, `reverseRef2`) re-present every document; deleting absent
-- rows is a no-op, so this is safe on every vintage.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'fts5';

DELETE FROM indexCursor WHERE indexName = 'reverseRef';
