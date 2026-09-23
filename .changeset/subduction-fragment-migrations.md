---
'@dxos/echo-host': patch
---

Repair Subduction storage on open through a ledger of data migrations: delete the stored remote-heads records and rewrite fragments written by clients on Automerge before 3.5, which listed their own head as a checkpoint and so made the document look unsynced with the edge forever.
Non-convergence diagnostics now report heads, sedimentree ids and handle states for the documents the remote is missing as well as the diverged ones, and escalate to `error` once a pair has made no progress for ~15 minutes.
