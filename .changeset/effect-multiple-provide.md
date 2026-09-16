---
'@dxos/edge-client': patch
---

Chained `Effect.provide` calls are collapsed into a single `Layer.provideMerge`. Build order, override direction, memoisation and finaliser order are unchanged; this satisfies the `multipleEffectProvide` diagnostic and is not a runtime change.
