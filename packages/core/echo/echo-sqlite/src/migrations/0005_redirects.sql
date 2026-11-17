--
-- Convergence-key merge redirects: each merged-away object and the object it merged into, read from
-- the loser's `system.mergedInto` when the indexer reads its document. Queries judge a dependency
-- (parent, relation endpoint) that merged away at the object it merged into.
--
-- Immutable: recorded in `echo_sqlite_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS echo_sqlite_redirects (
  spaceId TEXT NOT NULL,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  PRIMARY KEY (spaceId, fromId)
);
