---
'@dxos/echo-host': patch
---

The `CollectionSynchronizer.syncPeer` span now runs from a collection diverging from a peer until it is fully synced, opens a new span with its own id for every later divergence, and records the space id, what exposed the divergence and how it ended. The guest's `acceptInvitation` span records the space id, the invitation type, how the flow ended and whether EDGE or a member admitted the guest; `trace.spanEnd` accepts end attributes and always frees the span id, and the node OTel backend keeps attributes set after a span started.
