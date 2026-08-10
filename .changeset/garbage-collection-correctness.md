---
'@dxos/echo': minor
'@dxos/plugin-space': minor
---

Reclaim garbage-collected ECHO documents on every peer, and collect objects that were only transitively deleted. `db.runGarbageCollection()` now also sweeps children of deleted parents and relations with a deleted endpoint — objects that query as deleted without carrying a `deleted` flag of their own — and wipes each document's subduction records, which hold most of its bytes. Documents that leave a space directory are wiped locally as the unlink replicates, so one explicit collection frees disk everywhere; opt out with `autoReclaim: false`. `SpaceOperation.RemoveAllObjects` now collects after removing, so clearing a space reclaims its storage instead of leaving a tombstone per object. Adds `SpaceOperation.CollectGarbage`.
