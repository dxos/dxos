---
'@dxos/echo-client': patch
---

Two silent write-loss defects in the flush path. `RepoProxy.flush()` now rejects when a batch could not be sent instead of always resolving (`_sendUpdates` re-queues on failure and deliberately does not raise, so a writer torn down right after `flush()` resolves lost the batch), with failures scoped per attempt so concurrent flushes cannot mask each other. `DocHandleProxy._getPendingChanges()` returns the heads it staged and `_confirmSync(heads)` takes them explicitly, so one send's acknowledgement can no longer mark a concurrent send's changes as delivered — and the sync point never moves backwards.
