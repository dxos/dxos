---
'@dxos/ai': minor
---

`Model.defaultDecisionModel` now resolves to Cloudflare's Clef on Workers AI when no default is configured: `TypeSafeResolver.make` falls back to `Model.cloudflareClef` when it has a Workers AI route (jev on TypeSafe otherwise), and the TypeSafe plugin's **Default decision model** setting does the same when unset. Clef answers through EDGE on its own Cloudflare account, so every signed-in user gets a decision with no key connected.
