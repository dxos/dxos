---
'@dxos/echo-host': patch
---

Fix the ECHO host keeping a document handle it could never evict for each garbage-collected document that a client subscribed to again.
