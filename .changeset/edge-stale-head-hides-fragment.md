---
'@dxos/echo': patch
---

Peers syncing through EDGE no longer end up permanently behind on a document. Feed admission no longer stalls when EDGE pushes a block ahead of its metadata reply. A commit that arrives while the document is evicted, or that EDGE advertises beside a stale head, is now applied instead of sitting unapplied in local Subduction storage.
