---
'@dxos/echo': patch
---

Queries over large spaces run faster: the deleted-ancestor and missing-dependency checks walk each distinct parent, relation endpoint, schema and tag once rather than once per result row, and `reference()`, `sourceOf()` and `targetOf()` traversals no longer slow quadratically with their result size.
