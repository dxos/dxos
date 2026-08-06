---
'@dxos/echo': patch
---

Fixed main-thread memory amplification for feed-backed objects (e.g. open mailboxes): the per-object write-reconciliation state now retains a 128-bit digest instead of the full canonical JSON string, and reactive index queries drop each result's `documentJson` payload once it is hydrated into an identity-tracked feed core — together removing up to two full retained copies of every live feed object.
