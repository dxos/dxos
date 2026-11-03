---
'@dxos/echo-client': patch
---

An index hit waiting for this client's space root to link its object now stops when the database closes, rather than letting its timer fire against the released space root handle and throw `Database was not initialized with root object`.
