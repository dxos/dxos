---
'@dxos/echo': patch
---

Re-sync a document that a peer keeps advertising but never delivers: a Subduction fetch that settles without the bytes parks its entry until the connection is replaced, so collection sync now re-opens the round itself and a document missing on one device no longer stays missing for the life of the connection.
