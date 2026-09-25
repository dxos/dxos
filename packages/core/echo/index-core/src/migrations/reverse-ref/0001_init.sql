--
-- Reverse-reference index. `IF NOT EXISTS` is required: databases created by earlier releases
-- already hold this table. The index references only columns present since the table first
-- shipped, so it can live in the same migration.
--
-- Immutable: recorded in `reverse_ref_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS reverseRef (
  recordId INTEGER NOT NULL,
  targetDXN TEXT NOT NULL,
  propPath TEXT NOT NULL,
  PRIMARY KEY (recordId, targetDXN, propPath)
);

CREATE INDEX IF NOT EXISTS idx_reverse_ref_target ON reverseRef(targetDXN);
