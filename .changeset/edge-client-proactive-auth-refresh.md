---
'@dxos/edge-client': patch
---

Proactively refresh the cached HTTP auth header shortly before the server-advertised challenge TTL elapses, instead of provoking a 401 once per window. `/auth` responses may now carry `expiresInMs` beside the challenge; against servers that do not advertise it, behavior is unchanged (refresh on 401 only).

Signature change: `authenticateViaChallengeEndpoint` (public since the previous release train, introduced in #12541) now returns `{ presentation, expiresInMs }` instead of the bare presentation bytes — destructure `presentation` at call sites.
