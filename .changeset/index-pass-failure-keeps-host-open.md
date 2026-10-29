---
'@dxos/echo': patch
---

Deleting an identity in place no longer leaves feed index cursors without their stored token, which made every index pass fail with `Cursor token mismatch` after the next restart and kept every space on the device from opening. The wipe now waits for the index pass under way and drops the feed store's cached tokens (`EchoHost.wipeStorage`, `FeedStore.resetCaches`). A profile already in that state recovers: the indexer reads a feed again from the start when its cursor was issued by another store (`FeedStore.isCursorCurrent`). A failed index pass no longer closes the ECHO host for the rest of the session: it is retried with backoff, and a caller waiting on the index (such as `db.flush()`) fails with `IndexPassFailedError` instead of resolving as if its writes were indexed.
