--
-- Activity: how many Automerge changes (and ops) each document received per UTC hour.
--
-- Rows outlive their document: garbage collection does not undo edits that happened.
--
-- Immutable: recorded in `activity_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS activity (
  spaceId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  hour INTEGER NOT NULL,
  changes INTEGER NOT NULL,
  ops INTEGER NOT NULL,
  PRIMARY KEY (spaceId, documentId, hour)
);
