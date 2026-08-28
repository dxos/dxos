---
'@dxos/client-services': patch
---

Spaces no longer wedge in the initializing state when their root document cannot be fetched (e.g. during an edge outage): the load now retries with capped backoff until the network recovers. Initializing spaces stay listed in the navigation as loading workspaces instead of disappearing, so an unreachable space no longer renders as "workspace unavailable" or hides the space list.
