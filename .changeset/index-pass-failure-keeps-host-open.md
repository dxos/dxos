---
'@dxos/echo': patch
---

A failed index pass no longer closes the ECHO host for the rest of the session: it is retried with backoff while queries keep answering, where before every space on the device stopped opening until the worker restarted. A stored feed index cursor carrying a token the feed store did not issue now makes the indexer read that feed again from the start, instead of failing every pass with `Cursor token mismatch`. `FeedStore.isCursorCurrent` reports whether the store issued a cursor.
