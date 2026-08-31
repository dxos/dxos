---
'@dxos/log-store-idb': minor
---

Add `WorkerLogStore` and `runLogWriterWorker`: log persistence can now run in a dedicated (or shared) log-writer worker, so IDB writes survive main-thread saturation. `IdbLogStore` gains `append()`, a bounded in-memory queue (`maxQueueLines`), and flushes no longer stall behind an in-flight write; consumers can type stores as the new `LogStore` interface.
