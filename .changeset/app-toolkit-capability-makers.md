---
'@dxos/app-toolkit': minor
---

New `AppCapability` namespace: per-capability module makers (`surface`,
`settings`, `appGraphBuilder`, `translations`, `schema`, ...) that bake in the
default provides and module name, so plugins compose as a uniform chain of
`Plugin.addLazyModule`. Makers return named module interfaces (e.g.
`SurfaceModule`) keeping plugin `.d.ts` emit portable. The `AppPlugin.addXModule`
helpers they replace will be removed once all plugins are migrated.
