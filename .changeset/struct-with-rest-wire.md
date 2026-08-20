---
'@dxos/echo': patch
---

A struct with an open rest signature (`Schema.StructWithRest`) now survives the JSON Schema
round-trip. Effect 4 omits `additionalProperties` when the rest signature's value type is
unconstrained, and the serializer only restored it for bare records — so the decoder rebuilt the
struct closed and silently dropped every undeclared field. The restore now applies whenever the key
is absent, which is unambiguous: a closed struct always carries `additionalProperties: false`
explicitly.
