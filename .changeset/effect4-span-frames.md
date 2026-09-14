---
'@dxos/effect': patch
---

Errors from `EffectEx.runPromise` and `EffectEx.causeToError` include span frames again and drop Effect runtime frames. `SchemaEx.mapAst` keeps encoding checks on the nodes it rebuilds, and ECHO's JSON Schema output keeps the checks on optional properties.
