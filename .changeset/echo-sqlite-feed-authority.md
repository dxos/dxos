---
'@dxos/feed': minor
---

`FeedStore.appendReplacing` appends a block and deletes the feed's earlier blocks in one transaction, and `FeedStore.appendLocal` now reads and writes in one transaction, so several connections to one SQLite file never take the same block sequence. `FeedProtocol.WellKnownNamespaces` gains `automerge`, and `Obj.setParent` now notifies subscribers of the object.
