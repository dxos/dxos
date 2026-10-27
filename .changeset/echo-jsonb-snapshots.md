---
'@dxos/echo': minor
---

The index stores object snapshots as SQLite JSONB and queries ship them as `QueryResult.documentJsonb`, which the client turns into objects with the new `Obj.fromJSONB` in a single decode pass; `@dxos/util/Jsonb` reads the format. Existing snapshots are converted by a one-time migration.
