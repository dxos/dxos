---
'@dxos/echo': patch
---

Database writes to objects of a type rebuilt from JSON Schema (stored or published) now validate as they would against the original type: clearing an optional field is allowed, a discriminated-union member is found from its tag (or, with no tag, from the one member whose tag may be omitted), and clearing a union tag is rejected. A rejected write names the field.
