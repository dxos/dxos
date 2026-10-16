---
'@dxos/echo-client': patch
---

A live query with no order of its own keeps its results in id order (the natural order the planner and the index use) whichever source holds each object. Before, a write could move the objects it touched ahead of ones only the index held, and an object that started matching was placed by load order instead of id.
