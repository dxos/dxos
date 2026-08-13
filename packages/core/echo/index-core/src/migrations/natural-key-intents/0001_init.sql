--
-- Write-ahead intents for natural-key merging. Rows are inserted in the same transaction that
-- commits index rows and cursors, and deleted only after the merge pass services the key — so a
-- crash or a faulted pass can never leave a detected duplicate unserviced.
--
-- `IF NOT EXISTS` is required: databases created by releases that carried the table under the
-- entity-meta store already hold it.
--
-- Immutable: recorded in `natural_key_intent_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS naturalKeyIntents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spaceId TEXT NOT NULL,
  naturalKey TEXT NOT NULL
);
