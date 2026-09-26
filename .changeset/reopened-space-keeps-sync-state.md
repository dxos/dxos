---
'@dxos/echo-host': patch
---

A space reopened from storage no longer clears and rebuilds its collection sync state each time its
document list changes, and a replaced space directory is reported as retired only once. A device
joining a space that another device is syncing no longer receives EDGE's first replies as one router
message per frame, which could overload its connection and delay the join by several seconds.
