--
-- Drops the cursor rows of the retired `reverseRef2` index name. The name was bumped to
-- `reverseRef3` so every object is re-presented and `reverseRef.propPathNormalized` filled; the
-- rows under the old name would otherwise sit unread forever. Deleting absent rows is a no-op, so
-- this is safe on every vintage.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE indexName = 'reverseRef2';
