---
'@dxos/log-store-idb': minor
---

`IdbLogStore` fixes: flushes drain through a single loop so a stalled IDB write can no longer wedge later flush triggers while the queue grows unboundedly; the in-memory queue is capped (`maxQueueLines`, oldest lines dropped); eviction failures no longer surface as unhandled rejections; a `versionchange` close drops the cached connection so storage resets aren't blocked. Adds `append()` for enqueueing pre-serialized JSONL lines (used by worker-based log processors).
