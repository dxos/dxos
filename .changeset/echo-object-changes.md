---
'@dxos/echo': minor
---

Add `Obj.getChanges(obj, { property? })`, which reads an object's Automerge edit history as `Change.Change<T>` records carrying each change's time, actor and heads plus the object (or property) value before and after it.
