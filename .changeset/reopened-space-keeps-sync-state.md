---
'@dxos/echo-host': patch
---

A space reopened from storage no longer clears and rebuilds its collection sync state each time its
document list changes, and a replaced space directory is reported as retired only once. Before, every
object created in a reopened space restarted sync with EDGE and every peer from scratch.
