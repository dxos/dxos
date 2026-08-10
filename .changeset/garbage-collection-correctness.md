---
'@dxos/echo': minor
'@dxos/plugin-space': minor
---

Reclaim garbage-collected ECHO documents on every peer, and collect objects that were only transitively deleted. `db.runGarbageCollection()` now also sweeps children of deleted parents and relations with a deleted endpoint — objects that query as deleted without carrying a `deleted` flag of their own — and wipes each document's subduction records, which hold most of its bytes. Documents that leave a space directory are wiped locally as the unlink replicates, so one explicit collection frees disk everywhere; opt out with `autoReclaim: false`. `@dxos/migrations` gains `clearSpaceEpochMigration`, which drops every object in a space except a named set in a single epoch, and `SpaceOperation.RemoveAllObjects` is built on it — clearing a space is now permanent and no longer offers undo. Adds `SpaceOperation.CollectGarbage`.
