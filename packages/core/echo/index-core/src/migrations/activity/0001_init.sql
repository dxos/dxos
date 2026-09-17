--
-- Activity ledger: how many Automerge changes (and ops) happened in each space per UTC hour.
--
-- Append-only and never dropped: the fact that a change happened at a time is immutable.
--
-- Immutable: recorded in `activity_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS activity (
  spaceId TEXT NOT NULL,
  hour INTEGER NOT NULL,
  changes INTEGER NOT NULL,
  ops INTEGER NOT NULL,
  PRIMARY KEY (spaceId, hour)
);
