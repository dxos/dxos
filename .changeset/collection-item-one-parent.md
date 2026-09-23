---
'@dxos/echo': minor
'@dxos/plugin-space': minor
---

`Annotation.SetParent` takes options: `set()` makes a field its targets' parent, and `set({ override: false })` claims only targets that have no parent yet, so an object can be listed in several places while one of them owns it. `Obj.isOwnedBy` reports whether an entity is an object's parent, and an outgoing reference traversal now returns each array's targets in array order. Collections and project artifacts use this: an object created in a project is filed only there, and a collection that merely lists an object offers Show original and Remove instead of Delete. Breaking: replace `Annotation.SetParent.set(true)` with `Annotation.SetParent.set()`.
