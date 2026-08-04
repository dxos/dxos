---
'@dxos/echo-client': patch
---

`EchoDatabase.waitUntilHeadsReplicated` now also waits for the client's replica of the space root document to carry the given heads, so a query issued right after it sees the replicated objects instead of racing the client's routing table.
