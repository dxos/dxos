---
'@dxos/echo': patch
---

Deleting an identity in place no longer leaves feed index cursors without their stored token, which made every index pass fail with `Cursor token mismatch` after the next restart and kept every space on the device from opening. The wipe now waits for the index pass under way and drops the feed store's cached tokens (`EchoHost.wipeStorage`, `FeedStore.resetCaches`). A profile already in that state recovers: the indexer reads a feed again from the start when its cursor was issued by another store (`FeedStore.isCursorCurrent`), and a failed index pass is retried with backoff instead of closing the ECHO host for the rest of the session.
