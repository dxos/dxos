--
-- Re-presents every feed block to the primary indexes. A read from an empty feed cursor paged by
-- position but resumed by insertion id, so each earlier cursor reset (0006, 0007, 0008) skipped every
-- block inserted before others but positioned after them: local blocks the authority positioned
-- late. Those objects kept stale index rows, or none. Reading from the start again, in insertion
-- order, indexes them.
--
-- Immutable: recorded in `index_cursor_migrations` and never re-run.
--
DELETE FROM indexCursor WHERE sourceName = 'queue' AND indexName IN ('objectSnapshot', 'reverseRef3');
