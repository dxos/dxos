---
'@dxos/echo': patch
---

Update `automerge-subduction` to 0.17.2, which propagates writes only to peers subscribed to a sedimentree and no longer settles delivery before the write resolves.

Re-arm a subduction sync round for newly persisted commits whenever a connection is live. Because 0.17 counts only peers subscribed to a sedimentree, a peer census taken before the remote subscribed latched `"no-peers"` with no connection change left to clear it, and the stored commits were never broadcast — the document stayed permanently `different` in collection sync, which surfaced as replication that never converged.
