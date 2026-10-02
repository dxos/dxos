---
'@dxos/echo': patch
---

The public `@dxos/echo` functions and the `Database`, `Ref`, `QueryResult` and `Registry` methods now document their intended cost in a JSDoc `@performance` tag, so callers can tell O(1) reads from calls that scan, serialize or load.
