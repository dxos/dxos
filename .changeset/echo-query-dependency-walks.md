---
'@dxos/echo': patch
---

Queries over large spaces run several times faster: the deleted-ancestor and missing-dependency checks now walk each distinct parent, relation endpoint, schema and tag once, rather than once per result row.
