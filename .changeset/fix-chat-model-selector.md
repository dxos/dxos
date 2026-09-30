---
'@dxos/echo': patch
---

Fix object-property atoms dropping a ref's contents. `snapshotForComparison` shallow-copied every object value, but a `Ref` carries `uri` and `target` as prototype getters over private fields, so the copy came back empty — `useObject(obj, refField)` handed consumers a ref with no URI. Change detection for a ref held directly now compares the URI and the inlined target instead of reporting every mutation of the owning object as a change.
