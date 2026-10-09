--
-- Ledger of the data migrations in `automerge/subduction-migrations/` — rewrites of the Subduction records in
-- `automerge_chunks` that need the engine, unlike the schema changes recorded in `automerge_chunks_migrations`.
-- Kept beside the rows it describes, so a profile reset forgets the migrations with the data.
--
-- Immutable: recorded in `automerge_chunks_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS automerge_subduction_migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
