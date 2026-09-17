---
'@dxos/echo': minor
---

ECHO queries are now evaluated inside SQLite. The host compiles a query plan into one SQL statement over the index tables (`objectMeta`, the new `objectData` body store, `reverseRef`, `ftsIndex`) and no longer loads an Automerge document to answer a query; document rows are shipped as identity only (the client hydrates them itself, as before), feed rows keep their body. The in-memory executor and the `DX_ECHO_QUERY_EXECUTOR` switch are removed.

Storage: `objectData(recordId, body JSONB)` is written by the indexer alongside `objectMeta`; `objectMeta` gains `parentId`/`sourceId`/`targetId`, `reverseRef` gains `propPathNormalized`. Existing databases backfill on the first open after upgrade (queries await the backfill once); SQLite 3.45 or newer is required and asserted at open.

Behaviour changes, deliberate: ordering by a string property uses code-unit (BINARY) order instead of `localeCompare`; `gt`/`gte`/`lt`/`lte`/`Filter.between` no longer coerce across types (a number property never matches a string operand); the client working-set executor's natural order and `child-of` depth (now 10) match the host.
