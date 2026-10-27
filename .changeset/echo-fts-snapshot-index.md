---
'@dxos/echo': minor
---

The index's FTS change feed reads snapshots through `ObjectSnapshotIndex` (`countStampedSince`, `readStampedSince`) like every other snapshot reader, and compiled queries return the stored snapshot text without re-serializing it through SQLite `json()`. Breaking: `IndexedObjectSource` now takes an `ObjectSnapshotIndex` instead of a `SqlClient`.
