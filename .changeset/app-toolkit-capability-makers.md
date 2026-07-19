---
'@dxos/app-toolkit': minor
---

New `AppCapability` namespace: per-capability module makers (`surface`,
`settings`, `appGraphBuilder`, `translations`, `schema`, ...) that bake in the
default provides and module name, so plugins compose as a uniform chain of
`Plugin.addLazyModule`. Makers return an opaque `Capability.Module<Options>` —
parameterized only by its options type, so a module export never leaks a
foreign capability's type into plugin `.d.ts` emit. Capability owners can
build their own makers with `Capability.moduleMaker`. The `AppPlugin.addXModule`
helpers this replaces have been removed.
