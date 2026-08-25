---
'@dxos/echo': patch
---

Feed objects are now released when nothing holds them. `FeedHandle` kept every object it had ever hydrated in a strong identity map, so reading a large feed made it resident for the life of the handle even after the caller dropped every reference; the map is now keyed weakly, and the last subscription snapshot is released when the final subscriber unsubscribes. Objects with unflushed local changes are still held strongly — collecting one would lose the write — so residency now tracks the working set and pending writes rather than read history. Entity identity is unchanged while a caller holds an object; an object dropped and re-read is a fresh instance, as it was already for one never read.
