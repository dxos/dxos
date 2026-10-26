---
'@dxos/echo': minor
---

`Type.makeObject(dxn)` and `Type.makeRelation(dxn)(endpoints)` now also accept struct fields directly, with an optional second argument that transforms the struct, usually to add annotations: `Type.makeObject<Foo>(dxn)({ name: Schema.String }, flow(LabelAnnotation.set(['name']), DescriptionAnnotation.set('…')))`.
