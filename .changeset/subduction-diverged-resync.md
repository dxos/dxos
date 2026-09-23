---
'@dxos/echo-host': patch
'@dxos/feed': patch
---

A document that is `ready` locally but whose heads disagree with a peer's is now resynced once per head pair, so a push that never landed gets retried instead of leaving the space's sync progress stuck. The repo-wide share-policy kick is throttled in proportion to the number of loaded documents, which stops a loop that re-probed every document every few seconds.

`deleteSubductionRemoteHeads` (echo-host) deletes the Subduction `remote-heads` records a profile accumulated while edge came back under a new identity after every restart. They are sync bookkeeping that is re-learned on the next sync. When they outnumber the other rows, the chunk table is rebuilt in one transaction instead of deleting them row by row. It runs once on every profile's next open.

`FeedStore` no longer scans the whole `blocks` table for every pulled block: evicting a block's position slot now uses two index searches instead of one `OR` that SQLite planned as a table scan, which kept the storage worker saturated during a large initial feed sync.
