---
'@dxos/echo': patch
---

A document whose heads overlap a peer's counts as synced again, so collection sync stops reporting it as not converging. If the peer also advertises a change this replica lacks, one sync round is still run to fetch it.
