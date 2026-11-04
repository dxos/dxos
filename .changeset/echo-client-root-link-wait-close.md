---
'@dxos/echo-client': patch
---

An index hit whose database closes while it waits for the space root to link its object now resolves to no result, instead of throwing `Database was not initialized with root object` from a timer that outlived the database, or rejecting the load with `ContextDisposedError`.
