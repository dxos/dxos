---
'@dxos/echo-host': patch
'@dxos/index-core': patch
---

`IndexEngine` writes each batch over transactions of at most 250 objects or 50 ms, set with the new `transactionLimits` option, and calls an optional `yieldBetweenTransactions` hook between them; a document's cursor advances only with its last object. `EchoHost` yields between index transactions and full-text batches and lets a running query batch finish first, so a query issued during a large index pass waits behind one bounded transaction instead of the whole pass.
