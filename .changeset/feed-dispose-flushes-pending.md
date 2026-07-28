---
'@dxos/echo': patch
---

Disposing a feed handle now drains pending local updates before tearing down its object cache, instead of discarding them. Previously an `Obj.update` followed in the same tick by a database close (or a feed-handle eviction) cleared the dirty set before the scheduled background append ran, so the write was always lost. The drain is best-effort, matching the existing append contract where a failed send is retried in the background rather than surfaced — a send that keeps failing can still leave writes unpersisted.
