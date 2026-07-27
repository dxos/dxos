---
'@dxos/echo': patch
---

Disposing a feed handle now flushes pending local updates before tearing down its object cache. Previously a `Obj.update` followed in the same tick by a database close (or a feed-handle eviction) cleared the dirty set before the scheduled background append ran, silently dropping the write.
