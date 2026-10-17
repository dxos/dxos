---
'@dxos/echo-host': patch
---

Retire a document only when its load runs out of memory and its stored bytes hold at least 500K ops, counted without loading it, and quarantine only retired documents. Bloated documents that still load are no longer retired, and re-applying a space's retirements on every open logs at debug level.
