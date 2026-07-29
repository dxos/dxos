---
'@dxos/async': patch
'@dxos/echo-client': patch
---

Three silent write-loss defects in the flush path. `UpdateScheduler.runBlocking()`/`join()` now drain a pass that is scheduled but has not started yet — a throttled `trigger()` sits in its `maxFrequency` delay before it registers as running, so these barriers used to return while a pass was still pending, and since the callback drains shared queued state that work was neither done nor still queued. `RepoProxy.flush()` now rejects when a batch could not be sent instead of always resolving (`_sendUpdates` re-queues on failure and deliberately does not raise, so a writer that is torn down right after `flush()` resolves lost the batch), with failures scoped per attempt so concurrent flushes cannot mask each other. `DocHandleProxy._getPendingChanges()` returns the heads it staged and `_confirmSync(heads)` takes them explicitly, so one send's acknowledgement can no longer mark a concurrent send's changes as delivered — and the sync point never moves backwards.
