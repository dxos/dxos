--
-- Local spaces: device-only spaces that never replicate, named by the application that opened them. Their ids
-- look like any other space id, so whether a space is local is recorded here rather than in the id. Null for
-- every replicated space.
--
-- Immutable: recorded in `space_state_migrations` and never re-run.
--
ALTER TABLE echo_spaces ADD COLUMN local_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_echo_spaces_local_name ON echo_spaces(local_name) WHERE local_name IS NOT NULL;
