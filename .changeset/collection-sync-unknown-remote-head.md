---
'@dxos/echo-host': patch
---

Collection sync now treats a document as out of sync when EDGE advertises a head the local copy does
not contain. Previously, sharing any one head counted as converged. EDGE lists a new commit beside
its parents, so a peer still holding just the parents never fetched the commit. After a reconnect
that peer could stay behind indefinitely while its sync state reported caught up.
