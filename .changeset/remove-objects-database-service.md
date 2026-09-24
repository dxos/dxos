---
'@dxos/plugin-space': minor
---

`SpaceOperation.RemoveObjects` now declares `Database.Service`, so a caller must pass `spaceId` in the invoke options: `invokePromise(SpaceOperation.RemoveObjects, { objects }, { spaceId })`. A call without one fails to resolve the service. Every in-repo call site passes it.

This fixes removal on hosts that have no client `Space`, such as edge operation-service behind composer.dxos.network/mcp, where every `removeObjects` call failed its invariant and nothing was removed.
