---
'@dxos/edge-client': patch
---

Proactively refresh the cached HTTP auth header shortly before the server-advertised challenge TTL elapses, instead of provoking a 401 once per window. `/auth` responses may now carry `expiresInMs` beside the challenge; against servers that do not advertise it, behavior is unchanged (refresh on 401 only). `authenticateViaChallengeEndpoint` now returns `{ presentation, expiresInMs }`.
