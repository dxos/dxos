---
'@dxos/ai': patch
---

TypeSafe decisions can route through EDGE's `/ai/generate/typesafe` proxy: `EdgeAiService` in `@dxos/edge-client` accepts `'typesafe'`, and `TypeSafeResolver`'s `apiKey` may resolve to `undefined`, sending no credential, for a proxy that authenticates upstream.
