---
'@dxos/edge-client': minor
'@dxos/protocols': minor
---

Both edge clients now acquire their auth challenge from `GET /auth` instead of provoking a 401. `BaseHttpClient` prefetched `/auth` and acted only on a failure; `EdgeClient` never touched `/auth` at all — it fired a GET at the `/ws/:identityDid/:peerKey` upgrade path purely to harvest that path's 401. Both produced a red `Failed to load resource: 401` in the browser console on every client boot, and a routine `auth.failure` in edge's audit trail, for an operation that succeeded.

The shared `authenticateViaChallengeEndpoint` reads the challenge from either a 200 body (edge answers 200 for anonymous callers as of dxos/edge#775) or a `WWW-Authenticate` header, so this works against servers on either side of that change. Both clients keep their lazy 401-and-retry path for stale credentials.

Three bugs fell out of the shared parser:

- **Challenge lists were unparseable.** `WWW-Authenticate` carries a comma-separated list (RFC 9110 §11.6.1), but the old code asserted the header _started with_ `VerifiablePresentation challenge=`, so `Bearer realm="dxos", VerifiablePresentation …` — what edge emits whenever admin-key auth is also allowed — failed the invariant outright.
- **Quotes were never stripped**, relying on `Buffer.from` silently discarding them.
- **A dead protocol assignment** (`httpUrl.protocol = getEdgeUrlWithProtocol(...)`) assigned a whole URL string to `URL.protocol` and was silently ignored.

`handleAuthChallenge` keeps its signature, and the 401 assertion is relaxed to accept either shape, so callers such as `plugin-payments` need no change. `EdgeCredentialsHeaderCodec` in `@dxos/protocols` is new: it owns the `Authorization` and `sec-websocket-protocol` encodings that were previously open-coded on both sides.
