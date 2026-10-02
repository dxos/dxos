---
'@dxos/echo': patch
---

`ref.load()` and `ref.tryLoad()` on a reference into another space no longer throw `Cross-space
references are not yet supported`: the target resolves when its space is open on the same client,
and `tryLoad` returns `undefined` otherwise. The task-hierarchy migration keeps a task whose legacy
`parentTask` points into another space as a root instead of failing the space's migrations.
