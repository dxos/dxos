---
'@dxos/devtools': patch
---

The devtools objects tree no longer stalls on large spaces: it lists top-level objects a page at a time as you scroll, asks whether the rows in view have children with a single query, and queries an object's relations only while it is expanded, instead of holding two live queries for every listed object.
