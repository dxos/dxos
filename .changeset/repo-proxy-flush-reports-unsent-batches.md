---
'@dxos/async': patch
'@dxos/echo-client': patch
---

Three concurrency defects behind silent write loss in the flush path (the cause of a server-side writer's documents arriving empty — dxos/edge#758). `UpdateScheduler`'s pre-claim check is now atomic with the claim: the callback is not reentrant (it drains shared queued state), but a throttled `trigger` checked for a running pass only before its delay and `runBlocking` could start a pass in that window — the batch claimed by the unawaited pass then died with a short-lived caller. Measured in the edge reproduction harness at 0/24 failures with the fix vs 11/30 without. `RepoProxy.flush()` now rejects when a batch could not be sent instead of always resolving (`_sendUpdates` re-queues on failure and deliberately does not raise, so a writer torn down right after `flush()` resolves lost the batch), with failures scoped per attempt so concurrent flushes cannot mask each other. `DocHandleProxy._getPendingChanges()` returns the heads it staged and `_confirmSync(heads)` takes them explicitly, so one send's acknowledgement can no longer mark a concurrent send's changes as delivered — and the sync point never moves backwards.
