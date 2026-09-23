---
'@dxos/echo': patch
---

Recover from an edge subduction session loss by re-running the handshake on the existing connection instead of tearing it down, so the peer id and the collection sync state survive and a routine edge restart no longer costs a full re-announce of every document in the space.
