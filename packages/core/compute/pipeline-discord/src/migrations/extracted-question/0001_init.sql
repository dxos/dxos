--
-- The extracted-question store's initial schema. Equivalent to the DDL this store created inline
-- before migrations existed, so a database from an earlier release applies it as a no-op —
-- `IF NOT EXISTS` on every CREATE is what makes that true.
--
-- Immutable: recorded in `extracted_question_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS extracted_question (
  message_id TEXT NOT NULL,
  question TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_label TEXT,
  target_id TEXT NOT NULL,
  asked_at TEXT,
  PRIMARY KEY (message_id, question)
);

-- `list(targetId)` filters by target — index it so the lookup does not scan the whole table
-- (mirrors MessageStore's `message_target` index).
CREATE INDEX IF NOT EXISTS extracted_question_target ON extracted_question (target_id, message_id);
