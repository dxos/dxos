---
'@dxos/echo': minor
---

`Type.makeObject(dxn)` now also accepts struct fields directly, with an optional second argument that pipes annotations onto the struct: `Type.makeObject<Foo>(dxn)({ name: Schema.String }, LabelAnnotation.set(['name']))`.
