--
-- The agent registry's initial schema. Equivalent to the DDL this store created inline before
-- migrations existed, so a database from an earlier release applies it as a no-op.
--
-- `IF NOT EXISTS` on every CREATE is required, for exactly that reason. Later migrations are
-- `ALTER`s and deliberately not idempotent — `agent_registry_migrations` guarantees they run once.
--
-- Immutable: recorded in `agent_registry_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS agent (
  id TEXT PRIMARY KEY,
  label TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  first_seen TEXT,
  last_seen TEXT,
  ref TEXT
);

-- kind 'identifier' rows carry a real (namespace, value); kind 'alias' rows map a merged agent id
-- onto its canonical agent (the sameAs record).
CREATE TABLE IF NOT EXISTS agent_identifier (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  namespace TEXT,
  value TEXT,
  agent_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_identifier_agent ON agent_identifier (agent_id);
