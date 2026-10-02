---
'@dxos/echo-client': minor
'@dxos/plugin-devtools': minor
---

Record per-query metrics in ECHO (`queryMetrics`: fired, live, time to answer, items returned, grouped by query text) and show them in a revived devtools Queries card and a new Queries page, with slow queries colour-coded. Remove the unused `QueryInfo` type and `Stats.queries` field from `@dxos/devtools`.
