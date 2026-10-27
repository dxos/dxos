--
-- The heads each document object's snapshot was read at, whether or not a client can back the object, so a
-- query can answer from the snapshot whenever they are the document's current heads. `heads` keeps marking a
-- backable snapshot; a row stored before this column reads its version from `heads`.
--
-- Immutable: recorded in `object_snapshot_migrations` and never re-run.
--
ALTER TABLE objectSnapshot ADD COLUMN version TEXT;
