---
'@dxos/app-framework': minor
---

Align the capability authoring vocabulary on `contribute`. A module now
declares `provides`/`requires` (its contract) and, in `activate`, calls
`Capability.contribute(tag, value)` / `Capability.contributeAll(tag, values)`
to return `Contribution`s — matching the runtime nouns (`Contribution`,
`Contributions`, `manager.contribute`). Breaking: `Capability.provide` →
`Capability.contribute` and `Capability.provideAll` →
`Capability.contributeAll`. The legacy raw builder `Capability.contributes`
(which returned an untyped `Capability` entry) has been removed — use
`Capability.contribute`, whose NSID-branded return is already portable. The
`withPluginManager` `capabilities` test option now accepts `Contribution[]`.
