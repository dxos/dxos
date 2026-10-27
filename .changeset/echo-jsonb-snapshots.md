---
'@dxos/echo': minor
---

The index stores object snapshots as SQLite JSONB and queries ship them as `QueryResult.documentJsonb`, which the client turns into objects with the new `Obj.fromJSONB` in a single decode pass; `@dxos/util/Jsonb` reads and writes the format. The protobuf `QueryResult` gains `document_jsonb`, so a server can ship the stored bytes over a worker binding instead of re-encoding them as JSON text. Existing snapshots are converted by a one-time migration.
