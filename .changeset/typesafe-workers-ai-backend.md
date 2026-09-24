---
'@dxos/ai': minor
---

TypeSafe's jev decision model can now run on Cloudflare Workers AI: `AiService.decisionModel(Model.cloudflareJev.id)` answers through EDGE's Workers AI route, while `Model.typesafeJev` keeps TypeSafe's own API. `AiService.decisionModel` now accepts a model DXN as well as a bare NSID.

Breaking: `TypeSafeResolver.make` takes routes per provider (`{ typesafe, workersAi }`), and `TypeSafeResolver.provider` and `TypeSafeResolver.jevLatest` are replaced by `Provider.typesafe` and `Model.typesafeJev`.
