---
'@dxos/plugin-space': patch
---

`queryTypes` called with both `typenames` and `limit` now returns the named types. It used to apply `limit` to the whole sorted type list before picking out the named ones, so a named type sorting past the limit came back as `{ types: [] }`.
