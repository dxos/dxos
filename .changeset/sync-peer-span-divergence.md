---
'@dxos/echo-host': patch
---

The `CollectionSynchronizer.syncPeer` span now runs from a collection diverging from a peer until it is fully synced, opens a new span for every later divergence, and records the space id, what exposed the divergence and how it ended. `trace.spanEnd` accepts end attributes and always frees the span id, the node OTel backend keeps attributes set after a span started, and `@dxos/ai` loads under plain node, where it threw `parsimmon.regexp is not a function`.
