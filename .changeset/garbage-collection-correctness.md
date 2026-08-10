---
'@dxos/echo': minor
'@dxos/plugin-space': minor
---

Reclaim garbage-collected ECHO documents on every peer, and collect objects that were only transitively deleted. `db.runGarbageCollection()` now also sweeps children of deleted parents and relations with a deleted endpoint — objects that query as deleted without carrying a `deleted` flag of their own — and wipes each document's subduction records, which hold most of its bytes. Documents that leave a space directory are wiped locally as the unlink replicates, so one explicit collection frees disk everywhere; opt out with `autoReclaim: false`. Adds `db.retainObjects(keep)`, which replaces the set of objects the space directory tracks by diffing the retained ids against the directory's own maps — clearing a space is now one root change plus a collection, rather than a query over its contents and a soft delete per object. `SpaceOperation.RemoveAllObjects` is built on it and no longer offers undo. Adds `SpaceOperation.CollectGarbage`.
