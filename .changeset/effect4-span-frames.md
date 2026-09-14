---
'@dxos/effect': patch
---

Errors from `EffectEx.runPromise` and `EffectEx.causeToError` include span frames again and drop Effect runtime frames, and `SchemaEx.mapAst` keeps encoding checks on the nodes it rebuilds.
