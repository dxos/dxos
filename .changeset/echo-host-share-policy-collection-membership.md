---
'@dxos/echo-host': minor
---

Resolve a replicated document's containing space from local collection membership in the share policy, so a document whose handle is evicted or still loading is no longer falsely reported as belonging to no space. This fixes spurious `not authorized to access sedimentree` warnings and the replication stalls they caused, on both the edge/subduction and mesh replication paths.

Breaking: `createIdFromSpaceKey` is no longer re-exported from `@dxos/echo-host`; import it from `@dxos/echo-protocol` instead.
