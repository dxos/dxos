---
'@dxos/ai': minor
---

Cloudflare's Clef decision models are in the catalog: `Model.cloudflareClef` and `Model.cloudflareClefFlash` answer through the same Workers AI route as `Model.cloudflareJev`, and `Model.decisionModels` lists every decision model. `Model.defaultDecisionModel` is an alias a resolver swaps for the configured default; `TypeSafeResolver.make` takes it as `defaultModel` (jev on TypeSafe when unset), and the TypeSafe plugin sets it from its new **Default decision model** setting.
