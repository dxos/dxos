---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Fix ECHO array-field appends inside `Obj.update` to mutate in place instead of copying the whole array on every push, and retype `ScrollToAnchor`, `DeleteMessage`, and `MergeDuplicates` operation fields to hold typed refs instead of bare ids so handlers no longer have to re-resolve what they point at.
