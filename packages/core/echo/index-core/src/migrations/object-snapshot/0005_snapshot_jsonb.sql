--
-- Stores each snapshot as SQLite JSONB rather than JSON text: query predicates (`json_extract`, `json_each`)
-- read JSONB without parsing it, and the client decodes the same bytes without a text round trip. Writers
-- go through `jsonb(?)`; a reader that needs text calls `json(snapshot)`. The column keeps its declared
-- TEXT type because SQLite cannot change a column's type in place, and TEXT affinity stores a BLOB as is.
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
UPDATE objectSnapshot SET snapshot = jsonb(snapshot) WHERE typeof(snapshot) = 'text';
