---
'@dxos/echo-protocol': minor
---

`EscapedPropPath` and `referenceIndexKey` move from `@dxos/index-core` to `@dxos/echo-protocol`, and `QueryPlanner` no longer compiles plans to SQL: its `executor` and `sql` options are gone, `QueryExecutor` compiles under the `sql` executor, and `QueryExecutorMode` is no longer exported from `@dxos/echo-host/query` (it remains on the `@dxos/echo-host` root). An app that bundles the ECHO client no longer pulls `@dxos/index-core` or the SQL compiler into the tab.
