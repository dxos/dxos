---
'@dxos/echo': patch
---

Remap branch-registry document urls when a space is imported or copied (branch documents live outside `links`, so they were previously left pointing at the source space), and resolve a ref atom to `undefined` on its initial read when the target is already deleted (previously only handled on later updates).
