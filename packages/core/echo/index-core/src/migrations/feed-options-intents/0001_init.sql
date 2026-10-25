--
-- Write-ahead intents to apply a Feed object's indexing and retention options to the feed store.
-- Each indexing of a Feed object replaces the feed's row with a new one, in the transaction that
-- writes its index rows; the host applies the newest row per feed and deletes the rows up to the id it
-- read, so a row recorded while it applies survives.
--
-- Immutable: recorded in `feed_options_intent_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS feedOptionsIntents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spaceId TEXT NOT NULL,
  feedId TEXT NOT NULL,
  namespace TEXT NOT NULL,
  options TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedOptionsIntents_feed ON feedOptionsIntents(spaceId, feedId, id);
