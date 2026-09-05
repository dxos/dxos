# @dxos/protocols

## 0.12.0

### Minor Changes

- e954c0f: Resolve `google.protobuf.Any` in the buf shape-compat layer, so every `protoMessage()` type encodes through buf, and move the ECHO metadata stores onto it.
- 9ef5485: Support the `preserveAny` encoding option in the buf shape-compat layer, and move the RPC envelope and reliable-payload codecs onto it.
- 22bea85: `@dxos/config` is converted to buf (`@bufbuild/protobuf`) and no longer depends on protobuf.js.

  **Breaking** (riding the minor, per the pre-1.0 policy): `defs` and `ConfigProto` now come from the buf-generated module, which renders nested
  types flat — `Runtime.Client.ServicesMode` is `Runtime_Client_ServicesMode`, and so on for every
  nested message and enum. Config _inputs_ (loaders, savers, the `Config` constructor) take the new
  `ConfigInit` type; `Config.values` is a buf message, so it carries `$typeName` and compares against
  `toJson(ConfigSchema, …)` rather than a plain object.

  `runtime.app.env` is a `google.protobuf.Struct`, so its values are typed `JsonValue` rather than
  `any`. `getEnvString(config, key)` reads a string out of it, returning `undefined` for any other
  JSON value.

  `validateConfig` normalises through `create(ConfigSchema, …)` instead of running the protobuf.js
  `verify` pass; field types are checked by the compiler through `ConfigInit`. Loaders that read
  untrusted YAML should validate as they parse.

  `@dxos/protocols` gains `bufMessage()` alongside `protoMessage()`: an Effect codec for a buf message
  type with the same wire format, used by `SystemService.getConfig`.

- b4ceea2: Service descriptors can now be resolved from buf, via the new `@dxos/protocols/buf-service` export. `getBufService(typeName)` returns a descriptor built from `DescService` that encodes payloads through the shape-compat layer, and it is interchangeable with the protobuf.js one inside a `ServiceBundle`.

  `@dxos/codec-protobuf` gains `ServiceDescriptorLike`, the contract a service bundle actually needs — `name`, `createClient`, `createServer`. `ServiceDescriptor` implements it, and `@dxos/rpc`'s `ServiceBundle` is typed against it, so `pb.Service` is no longer reachable from the RPC layer.

  Wire-visible change for anyone reading it: `Any.type_url` on the RPC service path now carries buf's dot-free `typeName` rather than protobuf.js's dot-prefixed `fullName`. Peers dispatch on `Request.method` and decode `payload.value` by the method's declared type, so this is inert across versions — asserted by fixtures pairing a legacy peer with a buf one in both directions. The dot-free form already matched everywhere else: `Codec.encode` has always written it, and the messaging and swarm paths compare against it exactly.

- bdb02cd: `@dxos/protocols` gains a `./buf-shape-compat` entry point: `encodeCompat` / `decodeCompat` encode and decode buf (`@bufbuild/protobuf`) messages using the same JS object shapes the protobuf.js codec produces, so call sites can move to buf one at a time without every substituted field (`PublicKey`, `PrivateKey`, `TimeframeVector`, `Struct`, `Timestamp`) changing type under them.

  A message carrying `google.protobuf.Any` throws `UnsupportedSubstitutionError` rather than encode a differently-shaped value: the protobuf.js version resolves the payload through the schema registry via an `@type` discriminator and honours the `preserve_any` field option, which needs a buf-side type registry.

  The keyring (`dxos.halo.keyring.KeyRecord`) and the SQLite heads store (`dxos.echo.query.Heads`) now encode through this layer. Neither message has substituted fields, so the wire format is unchanged — asserted byte-for-byte against the protobuf.js codec. The heads store no longer needs its lazy-codec workaround, since the buf codec loads in workerd.

  `@dxos/effect-proto` (private, unpublished) is removed; its only consumer was a `@dxos/react-ui-form` storybook, now driven by a hand-authored Effect Schema.

- 48eb05d: Route service RPC payloads through buf. `protoMessage()` resolves each type in a buf registry over
  the generated file descriptors and encodes via the shape-compat layer, which preserves the
  protobuf.js field shapes, so no call site changes. Types whose descriptors carry a transitive
  `google.protobuf.Any` stay on the protobuf.js codec — 31 of 46 route through buf today.

  Fixes a `google.protobuf.Struct` double-encoding bug in that layer: `protoc-gen-es` already types a
  Struct field as a plain `JsonObject`, so re-encoding it produced a Struct keyed `fields` and decoded
  valid legacy bytes to `{}`. It affected every service call, since `dxos.error.Error` carries the only
  Struct on the RPC error channel.

  `DevtoolsHost.subscribeToCredentialMessages` also moves to `bufMessage(SignedMessageSchema)`; its
  only handler is an unimplemented stub, so no consumer observes the type change.

- 73daef4: Send `dx account login --method passkey` to the auth origin rather than the hub's API host.

  A passkey is bound to the WebAuthn relying party it was registered against, and Composer pins that to `composer.space` rather than the page host, so only an origin under that domain can present one. The hub answers on its API host as well, where the prompt renders, returns 200, and then fails in the browser with `SecurityError` and nothing else to go on. MCP avoided this by pinning `DX_AUTH_BASE_URL` to a blessed hostname, an unwritten constraint each new caller had to rediscover.

  `Runtime.Services.Hub` gains `auth_url`, resolved by `Account.getAuthUrl` the same way `url` is resolved by `getHubUrl`: `DX_AUTH_URL`, then `runtime.services.hub.authUrl`, then `DEFAULT_AUTH_URL` (`https://account.composer.space`). The `dev` and `local` CLI profiles set it to the dev hub's own serving origin.

- 4e417e9: Delete the protobuf `service {}` definitions for `ContactsService`, `EdgeAgentService`,
  `DevicesService`, `NetworkService`, `InvitationsService`, `IdentityService`, `SystemService`,
  `LoggingService`, `FeedService`, and `QueryService` from `dxos/client/services.proto`,
  `dxos/client/logging.proto`, `dxos/client/feed.proto` (file removed entirely), and
  `dxos/echo/query.proto`, now that all ten are served entirely over `@effect/rpc`. Message
  types still shared outside the RPC boundary (`ContactBook`, `QueryEdgeStatusResponse`,
  `QueryAgentStatusResponse`, `Device`, `Invitation`, `Identity`, `NetworkStatus`, `Platform`,
  `LogEntry`, and the `QueryService` request/response types, among others) are unaffected and
  remain protobuf-encoded on the wire. Consumers that imported a generated proto service
  interface type for any of these ten services must use `@dxos/protocols/rpc`'s effect-rpc
  definitions instead. `@dxos/client-protocol`'s deprecated `ClientServices` map keeps its existing entries'
  signatures — each is now backed by a hand-written Promise/`Stream` interface with the same
  shape as before — except `ClientServices['ContactsService']`, which had no consumers and is
  removed.
- 23d2d8c: Both edge clients now acquire their auth challenge from `GET /auth` instead of provoking a 401. `BaseHttpClient` prefetched `/auth` and acted only on a failure; `EdgeClient` never touched `/auth` at all — it fired a GET at the `/ws/:identityDid/:peerKey` upgrade path purely to harvest that path's 401. Both produced a red `Failed to load resource: 401` in the browser console on every client boot, and a routine `auth.failure` in edge's audit trail, for an operation that succeeded.

  The shared `authenticateViaChallengeEndpoint` reads the challenge from either a 200 body (edge answers 200 for anonymous callers as of dxos/edge#775) or a `WWW-Authenticate` header, so this works against servers on either side of that change. Both clients keep their lazy 401-and-retry path for stale credentials.

  Three bugs fell out of the shared parser:

  - **Challenge lists were unparseable.** `WWW-Authenticate` carries a comma-separated list (RFC 9110 §11.6.1), but the old code asserted the header _started with_ `VerifiablePresentation challenge=`, so `Bearer realm="dxos", VerifiablePresentation …` — what edge emits whenever admin-key auth is also allowed — failed the invariant outright.
  - **Quotes were never stripped**, relying on `Buffer.from` silently discarding them.
  - **A dead protocol assignment** (`httpUrl.protocol = getEdgeUrlWithProtocol(...)`) assigned a whole URL string to `URL.protocol` and was silently ignored.

  `handleAuthChallenge` keeps its signature, and the 401 assertion is relaxed to accept either shape, so callers such as `plugin-payments` need no change. `EdgeCredentialsHeaderCodec` in `@dxos/protocols` is new: it owns the `Authorization` and `sec-websocket-protocol` encodings that were previously open-coded on both sides.

- e56276b: Finishes the client-services protobuf-removal pass for the last three services —
  `DataService`, `DevtoolsHost`, `SpacesService` — completing the effect-rpc conversion for all
  13 client services. Inlines the remaining `protoMessage`-wrapped payloads that had no shared
  consumers outside the RPC boundary (`DataService`'s `BatchedDocumentUpdates`/`SpaceSyncState`;
  `DevtoolsHost`'s `Event`, `StorageInfo`, `GetSnapshotsResponse`, `SubscribeToFeedsResponse`,
  `SubscribeToSignalStatusResponse`) as Effect schemas, and deletes every proto message body and
  `service {}` block left dead by this and earlier partial-inlining passes — `dxos/echo/service.proto`
  is removed outright, and `dxos/devtools/host.proto`/`dxos/client/services.proto` keep only the
  handful of messages still embedding un-inlinable proto substitutions (`Timeframe`, etc.).
  `ClientServices.DataService`/`DevtoolsHost`/`SpacesService` are now typed via hand-written
  Promise/Stream interfaces instead of generated protobuf service types.
- 4689d66: **Breaking:** the RPC service contract (`RequestOptions`, `AnyEnvelope`, `TaggedType`, `ServiceBackend`, `ServiceProvider`, `ServiceDescriptorLike`) now lives in `@dxos/protocols/service-contract`; import it from there instead of `@dxos/codec-protobuf`. `ServiceDescriptorLike.createClient`/`createServer` take the compat layer's `CompatOptions` rather than protobuf.js's `EncodingOptions`, and `@dxos/codec-protobuf`'s `ServiceDescriptor.createClient` is declared to return the service type alone rather than intersected with its internal stub holder.

  `@dxos/rpc`, `@dxos/client-protocol`, `@dxos/messaging` and `@dxos/blade-runner` no longer depend on `@dxos/codec-protobuf`.

- 4663f24: Remove the `@dxos/teleport-extension-object-sync` package and the blob-sync teleport extension it
  implemented (peer-to-peer sync of opaque binary blobs), which had no active feature depending on
  it. `SpaceManager`/`SpaceProtocol` no longer accept or thread a `blobStore` option, and
  `DevtoolsHost.getBlobs` (and the devtools "Blobs" panel) are removed along with the underlying
  `dxos.echo.blob`/`dxos.mesh.teleport.blobsync` protobuf definitions. Also deletes 22 other
  protobuf `.proto` files under `@dxos/protocols` (KUBE/DXNS/bot-daemon/pre-Automerge-era message
  and service definitions) confirmed to have zero consumers anywhere in the codebase.
- 2896a58: Delete four more protobuf definitions confirmed to be entirely dead: `value.proto` (`Value`/`Stats`,
  never used as a field type anywhere), `echo/filter.proto` (`Filter`/`QueryOptions`, only reachable via
  `QueryRequest`'s `@deprecated` `filter` field, which no caller ever set and no handler ever read),
  `echo/model/document.proto` (the pre-Automerge DocumentModel mutation format), and `EchoObjectBatch`
  from `echo/object.proto` (`EchoObject`/`MutationMeta` in the same file are still live and unaffected).

  This also removes the now-provably-dead call chain each one anchored: `FeedMessage.Payload`'s `data`
  variant and the `DataMessage` message it carried (superseded entirely by direct Automerge persistence —
  no feed-writer in the repo ever constructed one), and `SpaceCache`/`SpaceMetadata.cache` (populated by
  `IMetadataStore.setCache`, which had zero call sites) along with the `Space.cache` RPC response field
  it fed, since space cache was never actually written by any code path.

- 9e91762: Recovery credentials can be labelled, told apart by kind, and revoked from Composer.

  `dxos.halo.credentials.IdentityRecovery` gains `label` and `kind` (`PASSKEY`, `RECOVERY_CODE`, `OAUTH`), so a management surface can distinguish a passkey from a recovery code rather than showing a column of identical dates. Both are set at creation: the passkey flow derives a default label from the platform, the recovery-code flow labels itself.

  A new `dxos.halo.credentials.IdentityRecoveryRevoked` assertion cancels a recovery credential. It is written to the identity's own control feed, mirroring how `SpaceDeleted` tombstones a space — the feed is append-only, so the original credential stays and the revocation marks it spent, and it replicates to the user's other devices. `IdentityService.revokeRecoveryCredential` writes it and refuses the last un-revoked credential.

  `Identity.Credential` gains an optional `recovery` field (`lookupKey`, `label`, `kind`, `revoked`) so consumers of the public HALO view can render and revoke without reaching into protobuf assertions.

- f8bfba0: Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

  Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
  Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
  in, and then a new space takes its id from an immutable root document rather than from the space
  key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
  document, and a legacy space is migrated onto a root when it loads, keeping its id.
  `SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
  admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.

### Patch Changes

- e207c68: The queue replicator service id now encodes the space id ahead of the namespace — `queue-replicator:{spaceId}:{namespace}` — matching every other replicator, which puts the space id first.

  `FeedProtocol.decodeServiceId` accepts both orderings, telling them apart by which segment is a valid space id, so no version marker is needed and clients on the old encoding keep working. The inbound path on the client only reads the service name (`serviceId.split(':')[0]`) and takes the space and namespace from the payload, so a peer decoding an id it did not encode is unaffected in either direction; there is no rollout ordering constraint.

  Why it matters: EDGE could not read the addressed space at a shared segment index, so every queue replicator frame — its highest-volume inbound path — fell through to a KV lookup per frame inside the router Durable Object's critical section, and was metered against the identity's HALO space instead of the space it addressed.

- 85e6347: Distinguish a rejected email login token from a recovery that failed for another reason, so a backend failure is no longer reported as an expired link.
- Updated dependencies [e8088ea]
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/codec-protobuf@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/timeframe@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/codec-protobuf@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/timeframe@0.11.1

## 0.11.0

### Minor Changes

- 962c8cd: Delete the redundant `dxos.iframe.WorkerService` protobuf service (and its `StartRequest` message) now that the tab→worker control channel is defined and served via effect-rpc (`WorkerService` in `@dxos/protocols/rpc`, over the app `MessagePort`). Also removes the now-unused `iframeServiceBundle` and `workerServiceBundle` exports from `@dxos/client-protocol` (they had no consumers). The `dxos.mesh.bridge.BridgeService` and `dxos.iframe.AppService`/`ShellService` protobuf definitions are retained — they are still used by the WebRTC transport bridge and the shell↔app iframe transport respectively.
- c727a43: Google OAuth access tokens are no longer replicated through ECHO. EDGE stores the granted token and
  returns a `MANAGED_ACCESS_TOKEN` placeholder in its place, which `Credential.CredentialsService`
  resolves transparently — consumers no longer see whether a credential came from the space or from
  EDGE. `CredentialQuery` gains `accessTokenId` so a specific `AccessToken` can be looked up rather
  than any credential for a service, which also fixes a by-service lookup that picked arbitrarily among
  a space's several connections to the same provider. `OnTokenCreated` and `TestConnection` now take
  `Credential.CredentialsService` in their requirement channel rather than reading `accessToken.token`.
  Existing connections keep working until their token expires; re-authenticating migrates them.
- c727a43: Deployed functions can now resolve server-custodied access tokens. A function has no identity to
  authenticate to EDGE's `/oauth/token` with, so `EdgeFunctionEnv.Env` gains an optional
  `ACCESS_TOKEN_SERVICE` binding that the runtime turns into a `Credential.AccessTokenResolver`. The
  binding is created bound to the invocation's space, so a function can only reach credentials for the
  space it runs in. Built-in operations run in a separate worker that does not yet receive the binding
  and so cannot resolve a managed token; EDGE must supply it there before enrolling a provider whose
  operations run server-side.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- 114fb98: Fix corruption of large query results containing emoji or other astral characters. The `QueryService` RPC now encodes its payloads with Effect schemas instead of protobuf, avoiding a `@protobufjs/utf8` bug that injected a lone surrogate into string fields larger than 8KB and broke object hydration.
- b591791: Add an in-app `@dxos/log` viewer (new `@dxos/react-ui-debug` `LogPanel`) so logs can be filtered, level-configured, and copied without opening DevTools; plugin-debug surfaces it as an R0 companion tab and a status-bar popover, and the devtools performance panel reuses the same component. Make the devtools `subscribeToFeeds`/`subscribeToSpaces` `feedKeys`/`spaceKeys` payload fields optional, fixing a Storage-panel schema decode error on empty subscriptions. Reimplement the devtools performance `Panel` and `PanelContainer` on the shared `@dxos/react-ui` `Panel` primitive.
- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
