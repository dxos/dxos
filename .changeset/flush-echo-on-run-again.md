---
'@dxos/compute-runtime': patch
---

`wrapFunctionHandler` now flushes ECHO writes when an operation exits with `Operation.runAgain()`, as it does on success. Before, a run that wrote a checkpoint and then asked to run again could lose those writes.
