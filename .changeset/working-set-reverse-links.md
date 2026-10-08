---
'@dxos/echo': patch
---

Live queries that follow relations or parent/child links read a reverse-link index of the loaded objects, kept current as objects change. Each step now costs the size of its result instead of a scan of every loaded object. With 2,000 loaded objects, a relation-and-children query runs about 130× faster.
