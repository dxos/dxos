---
'@dxos/echo': minor
---

Add the `Property` module: DXN-identified, typed properties that each type implements through a lens onto its own fields — two-way via a field path, or one-way via a computed getter. `Obj.getLabel` / `Obj.setLabel` now resolve through `Property.Title`; `Annotation.LabelAnnotation` keeps working as its serialized form.
