---
'@dxos/client-services': patch
---

Spaces no longer wedge in the initializing state when their root document cannot be fetched (e.g. during an edge outage): the load now retries with capped backoff until the network recovers, so the space becomes ready without an app restart once its documents are reachable again.
