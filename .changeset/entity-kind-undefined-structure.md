---
'@dxos/echo-client': patch
---

An object core whose linked document settled without the body now reports `isBodyAvailable: false`, and the read paths — query selection, filtering, every traversal, entity lookup and load resolution — check it instead of assuming a core has a structure. Such a core previously answered queries with an undefined structure, crashing any relation traversal (which scans every loaded core) with `TypeError: Cannot read properties of undefined (reading 'system')`. The core keeps its identity across the body arriving, at which point it becomes available and queries surface it.
