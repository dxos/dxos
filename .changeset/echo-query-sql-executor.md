---
'@dxos/echo': minor
---

Adds a second query executor that evaluates a query inside SQLite: the host compiles the query plan into one statement over the index tables (`objectMeta`, `objectSnapshot`, `reverseRef`, `ftsIndex`) and loads no Automerge document to answer it. Off by default. Select it per host with `EchoHost({ queryExecutor: 'sql' })` or `DX_ECHO_QUERY_EXECUTOR=sql`; the in-memory executor remains the default and is unchanged.

A plan whose filters read `@meta` (foreign keys, a registry key or version, tags) always takes the in-memory path, because `objectSnapshot` stores no `@meta` for document rows.

Storage, written on the existing indexing pass whichever executor is selected: `objectMeta` gains `parentId`/`sourceId`/`targetId`, and `reverseRef` gains `propPathNormalized`. The reverse-reference index re-presents its rows once after upgrade to fill the new column. SQLite 3.45 or newer is required and asserted when the index opens.

Behaviour differences under `sql`, deliberate: ordering by a string property uses code-unit (BINARY) order instead of `localeCompare`; `gt`/`gte`/`lt`/`lte`/`Filter.between` do not coerce across types, so a number property never matches a string operand. The client working-set executor's natural order and `child-of` depth (now 10) were aligned with the host for both paths.
