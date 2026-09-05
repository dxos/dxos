# @dxos/edge-client

## 0.12.0

### Minor Changes

- 23d2d8c: Both edge clients now acquire their auth challenge from `GET /auth` instead of provoking a 401. `BaseHttpClient` prefetched `/auth` and acted only on a failure; `EdgeClient` never touched `/auth` at all — it fired a GET at the `/ws/:identityDid/:peerKey` upgrade path purely to harvest that path's 401. Both produced a red `Failed to load resource: 401` in the browser console on every client boot, and a routine `auth.failure` in edge's audit trail, for an operation that succeeded.

  The shared `authenticateViaChallengeEndpoint` reads the challenge from either a 200 body (edge answers 200 for anonymous callers as of dxos/edge#775) or a `WWW-Authenticate` header, so this works against servers on either side of that change. Both clients keep their lazy 401-and-retry path for stale credentials.

  Three bugs fell out of the shared parser:

  - **Challenge lists were unparseable.** `WWW-Authenticate` carries a comma-separated list (RFC 9110 §11.6.1), but the old code asserted the header _started with_ `VerifiablePresentation challenge=`, so `Bearer realm="dxos", VerifiablePresentation …` — what edge emits whenever admin-key auth is also allowed — failed the invariant outright.
  - **Quotes were never stripped**, relying on `Buffer.from` silently discarding them.
  - **A dead protocol assignment** (`httpUrl.protocol = getEdgeUrlWithProtocol(...)`) assigned a whole URL string to `URL.protocol` and was silently ignored.

  `handleAuthChallenge` keeps its signature, and the 401 assertion is relaxed to accept either shape, so callers such as `plugin-payments` need no change. `EdgeCredentialsHeaderCodec` in `@dxos/protocols` is new: it owns the `Authorization` and `sec-websocket-protocol` encodings that were previously open-coded on both sides.

### Patch Changes

- b0953f0: Pre-authenticate every EdgeHttpClient endpoint that the edge worker authenticates, so credentials go
  out with the first request instead of after a 401 challenge.
- 375b863: Proactively refresh the cached HTTP auth header shortly before the server-advertised challenge TTL elapses, instead of provoking a 401 once per window. `/auth` responses may now carry `expiresInMs` beside the challenge; against servers that do not advertise it, behavior is unchanged (refresh on 401 only).

  Signature change: `authenticateViaChallengeEndpoint` (public since the previous release train, introduced in #12541) now returns `{ presentation, expiresInMs }` instead of the bare presentation bytes — destructure `presentation` at call sites.

- 3e02201: Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
  templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
  edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
  production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
  `@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
  name no longer resolves).
- dde6714: Report edge connection uptime as whole seconds, fixing the `invalid int32` error thrown when encoding `EdgeStatus`.
- 5ceaf9c: EDGE HTTP requests now use the prefix-per-service paths (`/db`, `/identity`, `/compute`, `/blob`) instead of the legacy top-level ones, per `docs/design/system/http-route-migration.md` in `dxos/edge`.

  - `EdgeHttpClient`: `/spaces/*` → `/db/spaces/*`, `/identity/recover` → `/db/identity/recover`, `/agents/*` → `/identity/agents/*`, `/users/:did/agent/*` → `/identity/users/:did/agent/*`, `/functions/*` and `/workflows/*` → `/compute/*`, and `getBlobUrl` now returns `/blob/file/:key`.
  - `@dxos/plugin-wnfs` blockstore requests move from `/api/file` to `/blob/file`.

  Both forms answer on edge today, so this is not a breaking change for callers of these methods; `/oauth/*`, `/atproto/*`, `/registry/*`, `/status` and `/auth` are pinned and unchanged, and `/triggers/*` is left alone (it is not a migration target).

- 10defed: Report a space's root document to edge once the space is anchored.

  `EdgeHttpClient` gains `recordSpaceRoot`, which names the automerge document that roots a space.
  Edge cannot derive it — a space id is the hash of its space key, and no document id reproduces
  that — so without being told, edge never finds the credentials document and the space stays on its
  control feed. `DataSpaceManager` calls it as part of anchoring, behind the same
  `DX_AUTOMERGE_CREDENTIALS` opt-in; a failed report is logged rather than raised, since anchoring is
  local and already complete by then.

  The record is write-once on the edge side, so re-anchoring an existing space returns the root
  already in force rather than replacing it.

  `EchoHost` also enrols the space root and credentials documents in the space's replicated set. They
  hang off the space rather than the directory's links, so nothing replicated them and edge could not
  read the documents it was being asked to validate.

- bb94124: Run OAuth in the system browser on desktop, via a loopback callback server, so sign-in and integration flows work in the native app. Adds `NativeOAuth` to app-toolkit and a public `getAuthHeader()` to the EDGE HTTP clients.
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [23d2d8c]
- Updated dependencies [e56276b]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/util@0.12.0
  - @dxos/keyring@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/crypto@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyring@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/keyring@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
