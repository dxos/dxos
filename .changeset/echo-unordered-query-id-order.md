---
'@dxos/echo-client': patch
---

A live query that selects one type, or everything, in a space with no order, limit, skip, traversal or aggregate keeps its results in id order (the natural order the planner and the index use) whichever source holds each object. Other query shapes, by-id queries included, keep their existing order. Before, a write could move the objects it touched ahead of ones only the index held, and an object that started matching was placed by load order instead of id.
