---
'@dxos/echo-host': patch
---

Keep a peer's replication running when it gains access to another space: under Subduction the host now re-drives denied rounds instead of re-announcing the peer, which bound a second connection and stranded the rounds pending on the first.
