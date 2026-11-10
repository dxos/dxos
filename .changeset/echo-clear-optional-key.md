---
'@dxos/echo': patch
---

Fix database writes to objects whose type was rebuilt from JSON Schema: clearing an optional field and writing inside a discriminated-union field no longer fail validation, and a rejected write names the field.
