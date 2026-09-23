---
'@dxos/compute-runtime': patch
---

Trigger dispatcher tolerates stale trigger references: a trigger whose target object was deleted or whose operation has no registered handler is parked and surfaced on the dispatcher state instead of failing the dispatch or refresh pass it runs in.
