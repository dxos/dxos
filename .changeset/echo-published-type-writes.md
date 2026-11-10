---
'@dxos/echo': patch
---

Database writes accept clearing an `optionalKey` field and resolve discriminated-union members of types rebuilt from JSON Schema (stored or published); a rejected write names the field.
