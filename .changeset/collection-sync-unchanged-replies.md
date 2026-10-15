---
'@dxos/echo-host': patch
---

An unchanged collection state from an in-sync peer no longer copies the collection to compare it. EDGE answers each space's poll every 10 s with every document's heads, and each reply was copied and diffed twice.
