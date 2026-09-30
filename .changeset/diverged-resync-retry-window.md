---
'@dxos/echo': patch
---

Retry the resync of a document whose heads diverge from a peer's instead of attempting it once: a
sync round that is lost in transit moves neither side's heads, which used to strand the document
until one of them wrote again or the connection dropped.
