---
'@dxos/compute-runtime': patch
---

The EDGE function context now provides `Hypergraph.Service` alongside `Database.Service`. Operations declaring the cross-space handle — such as the `tasks.*` verbs a harness hook fires with no space id — previously failed at their first service access with `Service not found: @dxos/echo/Hypergraph/Service`.
