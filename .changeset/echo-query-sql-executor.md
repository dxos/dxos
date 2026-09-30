---
'@dxos/echo': minor
---

Adds a second query executor that evaluates a query inside SQLite, off by default. The host compiles the query plan into one statement over the index tables (`objectMeta`, `objectSnapshot`, `reverseRef`, `ftsIndex`) and loads no Automerge document to answer it. Select it with `runtime.client.queryExecutor: SQL` in config, `EchoHost({ queryExecutor: 'sql' })`, or `DX_ECHO_QUERY_EXECUTOR=sql`. The in-memory executor remains the default.

**Ordering by a string property changed on both executors.** It now compares by code unit — SQLite's `BINARY` collation — where it previously used `localeCompare`, so `['apple', 'Banana']` orders as `['Banana', 'apple']`. This affects the default in-memory path too, not only the new one: the two executors have to agree, because under `orderBy(...).limit(n)` the collation decides which rows are returned, not merely their order. `max`/`min` aggregates over strings follow the same rule.

Three query shapes always take the in-memory path, whatever the setting, because compiling them would need to read the store before the statement exists: a filter reading `@meta` (foreign keys, a registry key or version, tags), a `metaVersion` semver range, and a `timestamp` day group in a named time zone.

Storage, written on the existing indexing pass whichever executor is selected. `objectMeta` gains `parentId`/`sourceId`/`targetId`, backfilled for existing rows by a migration; `reverseRef` gains `propPathNormalized` and re-presents its rows once after upgrade to fill it. SQLite 3.45 or newer is now required, and asserted when the index opens.

Other deliberate differences under `sql`: `gt`/`gte`/`lt`/`lte`/`Filter.between` do not coerce across types, so a number property never matches a string operand. The client working-set executor's natural order and `child-of` depth (now 10) were aligned with the host, which affects both paths.
