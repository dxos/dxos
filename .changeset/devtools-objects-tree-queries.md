---
'@dxos/devtools': patch
---

The devtools objects tree no longer stalls on large spaces: it holds one space-wide query plus one per expanded node, instead of two live queries for every listed object.
