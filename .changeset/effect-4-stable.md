---
'@dxos/echo': minor
---

Move Effect from 4.0.0-rc.117 to the 4.0.0 stable release. **Breaking:** the `effect` peer
dependency is now 4.0.0, which drops the `effect/unstable/` prefix, so imports of those modules move
too: `effect/unstable/http/HttpClient` becomes `effect/http/HttpClient`, and
`effect/unstable/httpapi` becomes `effect/http-api`.
