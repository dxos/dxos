---
'@dxos/client': patch
'@dxos/client-protocol': patch
---

A worker whose OPFS cannot open a sync access handle now reports that once, at startup, instead of failing every database open for the life of the page. There is no in-memory fallback: it would show none of the stored data and keep nothing written to it. Creating a space no longer fails when its database takes longer than five seconds to initialize under load.
