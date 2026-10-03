--
-- Write-ahead intents for convergence-key merging. An intent row means "check whether the group
-- named by this key needs merging", not "duplicates exist": one is recorded for every keyed
-- object the indexer processes, before any duplicate detection runs. The merge pass looks the
-- group up, merges it if it holds two or more live members (a group of one is a no-op), and
-- vacates the rows for that key — bounded by the id captured when the pass read them, so intents
-- recorded by a concurrent indexing pass survive.
--
-- Rows are inserted in the same transaction that commits index rows and cursors, and deleted only
-- after the merge pass services the key — so a crash or a faulted pass can never leave a detected
-- duplicate unserviced.
--
-- `IF NOT EXISTS` is required: databases created by releases that carried the table under the
-- entity-meta store already hold it.
--
-- Immutable: recorded in `convergence_key_intent_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS convergenceKeyIntents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spaceId TEXT NOT NULL,
  convergenceKey TEXT NOT NULL
);
