---
'@dxos/observability': patch
---

Import `SpaceState` and `DeviceKind` from `@dxos/protocols` rather than the `@dxos/client` barrels, keeping echo-client (and wa-sqlite/automerge-repo with it) out of a consuming app's eager boot graph.
