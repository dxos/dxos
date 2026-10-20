---
'@dxos/echo-host': patch
---

Quarantine a document whose load runs out of memory only when its stored bytes hold at least 100K ops, counted without loading it, so a small document that fails because the heap is already full is left alone. Log the retirements a space directory re-applies on every open at debug level.
