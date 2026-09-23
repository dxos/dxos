---
'@dxos/ai': patch
---

`TypeSafeResolver`'s `apiKey` may resolve to `undefined`, sending no credential, for a proxy that authenticates upstream (EDGE's `/ai/generate/typesafe`).
