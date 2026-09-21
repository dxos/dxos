---
'@dxos/echo-host': patch
---

Repair Subduction storage on open through a ledger of data migrations: delete the stored remote-heads records (the recovery page's Repair) and rewrite fragments written by clients on Automerge before 3.5, which listed their own head as a checkpoint and so made the document look unsynced with the edge forever.
