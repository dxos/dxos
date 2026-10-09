---
'@dxos/async': patch
'@dxos/echo-host': patch
'@dxos/index-core': patch
'@dxos/sql-sqlite': patch
---

`IndexEngine` writes each batch over transactions of at most 250 objects or 50 ms, set with the new `transactionLimits` option, and calls an optional `yieldBetweenTransactions` hook between them; a document's cursor advances only with its last object. The OPFS SQLite client now hands its connection to the longest waiter when a transaction ends, so a statement queued behind a transaction runs before the same writer's next one. `EchoHost` pauses between index transactions and full-text batches with the new `yieldBehindQueuedTasks`, which lets messages already queued in the worker run first, unlike `scheduler.yield`. A query issued during a large index pass now waits behind one bounded transaction instead of the whole pass.
