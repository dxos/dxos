---
'@dxos/echo': patch
---

Fix database writes to objects whose type was rebuilt from published JSON Schema, as plugin bundles on EDGE resolve other plugins' types: clearing an optional field and writing inside a discriminated-union field now pass validation as they do for the original type. A write the schema rejects now names the field.
