---
'@dxos/echo-host': patch
---

The `CollectionSynchronizer.syncPeer` span now measures a collection's sync with a peer from divergence until fully synced, and every divergence after the pair syncs opens a new span. It is exported to remote tracing with the space id, what exposed the divergence, and how it ended (`synced`, `disconnected` or `closed`). `trace.spanEnd` accepts attributes known only when the span ends and always frees the span id, and the node OTel backend now keeps attributes set after a span started instead of dropping them.
