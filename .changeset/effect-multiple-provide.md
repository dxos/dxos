---
'@dxos/edge-client': patch
---

Chained `Effect.provide` calls are collapsed into a single `Layer.provideMerge`, so each layer stack is constructed once rather than once per link in the chain.
