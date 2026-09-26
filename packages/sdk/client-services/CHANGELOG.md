# @dxos/client-services

## 0.12.0

### Minor Changes

- a1a22ee: Fix EDGE-configured hosts silently never using their edge client for invitation admission and agent creation, resync stale profile fields when an identity changes elsewhere, subscribe to previously-unwatched ECHO fields across several article surfaces, and replace several hand-rolled list/wrapper divs with the shared Listbox/Flex/Grid primitives.

  **Breaking:** several published namespace exports were renamed for consistency with the
  `import-as-namespace` convention (the `Foo`-prefix on a member of a `Foo` namespace was redundant).
  Pre-1.0, these ride a minor rather than a major:

  - `@dxos/assistant-toolkit`: `Memory` (was a namespace wrapping a `Memory` class; the root export is
    now the class itself)
  - `@dxos/compute`: `Trace.TraceWriter` → `Trace.Writer`
  - `@dxos/compute-runtime`: `ProcessManager.ProcessManagerImpl` → `ProcessManager.Impl`,
    `ProcessHandle.ProcessHandleImpl` → `ProcessHandle.Impl`
  - `@dxos/ai`: `ScriptedLanguageModel.scriptedLanguageModelLayer` → `ScriptedLanguageModel.layer`
  - `@dxos/sql-sqlite`: `OpfsWorker.OpfsWorkerConfig` → `OpfsWorker.Config`

  Consumers pinning these packages (e.g. `dxos/edge` via `pkg.pr.new`) need to update to the new names.

- 760cc03: Restructure the package: acyclic module graph, subsystem contracts, namespaces-only exports.

  **Breaking.** Every import from this package changes; the sections below say how.

  **The package has no flat exports.** Everything is reached through a namespace —
  `Storage.createStorageObjects`, `Spaces.DataSpace`, `ServiceStack.layerClientServices`,
  `WorkerRuntime.makeWorkerRuntime` — and the implementations live under `src/internal/`, which is
  not exported. The `./testing` subpath is unchanged.

  **Services are reached through their subsystem's contract**, not through a tag next to the
  implementation: `IdentityContract.ManagerService`, `SpacesContract.ManagerService`,
  `InvitationsContract.ManagerService`, and the `Provider`/`Lifecycle`/`SigningContextProvider` tags
  alongside them. Each contract owns the interfaces its tags are typed against, so depending on a
  service no longer means depending on the class that implements it.

  The whole space subsystem is one namespace: `Spaces` now covers the transport-level space and its
  manager, the data spaces above it, and the archive format — there is no `Space` or `SpaceExport`.

  Two namespaces could not take their obvious name: `Worker` collides with
  `@dxos/worker-framework/Worker`, so the runtime is `WorkerRuntime`; `Platform` collides with the
  `Platform` message type from `@dxos/protocols`, so the probe is `PlatformInfo`.

  Why: the 19 packlets contained one strongly connected component of 11, because `packlets/services/`
  was simultaneously the top of the stack (the layer-spec aggregation) and the bottom (the lifecycle
  events, readiness gate, SQLite storage and platform probe every packlet imports), and because each
  `Context` tag was declared next to the class it wraps. The graph goes from 57 edges and an
  11-packlet cycle to 33 edges and none. `moon run client-services:graph` asserts both the absence of
  cycles and that no contract imports an implementation — on type edges as well as runtime ones, since
  a tag typed against a class keeps the dependency while erasing the import that would show it.

  Rationale and measurements: `docs/DEPENDENCY-GRAPH.md` and `docs/REFACTOR.md`.

- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process hook controller.

  - `@dxos/effect` gains a `Hook` module (`Hook.make`, `Hook.on`, `Hook.handler`, `Hook.subscribe`, `Hook.emit`, `Hook.Controller`, `Hook.makeController`, `Hook.controllerLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

- a6559a2: Effect failure channels carry tagged errors rather than the global `Error`. Where the channel was also annotated `Effect<..., Error>` the annotation is narrowed too, since a tagged error behind an `Error` annotation is not something `catchTag` can see: the RPC service implementations declare `BaseError`, and the assistant's connector validation declares the error it actually raises.

  `DevtoolsHost`'s seven unimplemented stubs fail with `NotImplementedError` naming the method, rather than a fallback error whose message asserted that an operation failed.

  DeepSeek API-key validation raises `ConnectorKeyInvalidError` for a 401/403, matching what the Anthropic form already raised for the same condition.

- f654860: Rename the hypercore-specific `feed` naming to `hypercore`, so that `feed` is left to the unrelated ECHO feed concept.

  **Breaking:** `@dxos/feed-store` renames every export. `FeedStore` → `HypercoreStore`, `FeedWrapper` → `HypercoreWrapper`, `FeedFactory` → `HypercoreFactory`, `FeedQueue` → `HypercoreQueue`, `FeedIterator` / `FeedSetIterator` → `HypercoreIterator` / `HypercoreSetIterator`, `FeedWriter` → `HypercoreWriter`, `FeedBlock` → `HypercoreBlock`, `FeedIndex` → `HypercoreIndex`, `FeedOptions` → `HypercoreCreateOptions`, along with the Effect services and layers, and the `openFeed` / `createFeed` / `addFeed` / `hasFeed` / `getFeed` methods. There are no compatibility re-exports.

  `@dxos/hypercore` renames `HypercoreFactory` to `RawHypercoreFactory`, freeing the unqualified name for the store-level factory.

  Stored data and the wire protocol are untouched: protobuf messages, credential assertions and serialized property names such as `feedKey` keep their names.

- 608a172: The client services stack is built from `LayerSpec`s aggregated by a `LayerStack`, instead of a hand-written chain of `provideMerge` calls.

  Each part of the stack is its own top-level spec declaring the tags it requires and the tags it provides, so build order — and which specs are built at all — follows from the graph. `clientServiceSpecs` is the list of them with the option-driven choices applied, and `makeClientServicesStack` is what every embedder builds: the worker runtime, `LocalClientServices` and the test `ServiceContext`. They reach services through `resolve(tag)` rather than a context of everything.

  `LayerSpec` takes an `eager` flag, and `LayerStack` builds those specs when a slice initializes rather than waiting for one of their tags to be requested. Specs are resolved lazily by tag, so a spec whose point is a side effect — registering an rpc service, subscribing to lifecycle events, attaching a replicator — provides nothing anyone asks for and would never run. `eager: true` builds it (with whatever provides its requirements) as soon as the slice's own requirements are in place, once per slice. `LayerStack.init` builds those specs without asking for a tag, which is how an embedder starts a stack whose point is its side effects.

  `LayerStack.layer` declares the ambient services as tags rather than taking an opaque `Context`, so the returned layer requires exactly those tags and a missing one is a compile error instead of a silently pruned spec. `LayerStack` still accepts ambient `services` directly: a context available to every slice as if a lower-affinity one provided it, which is the only way into the lowest slice.

  `LayerStack` also disposes a slice's batch runtimes newest first rather than concurrently: a batch materialized later may hold services from an earlier one, and Effect orders finalizers only within a single runtime.

- 9d2466a: The MESH byte pipe is now WHATWG web streams rather than Node `Duplex`, and the browser-facing paths through it no longer use `Buffer`. The hypercore bridge still converts with `Buffer.from`, because hypercore requires it, and the node-only websocket upgrade path keeps `Buffer` deliberately.

  `WireProtocol.stream`, `TransportOptions.stream`, `Teleport.stream` and `Muxer.createStream()` now carry `{ readable: ReadableStream<T>; writable: WritableStream<T> }` — exported as `DuplexStream<T = Uint8Array>` from `@dxos/teleport` — instead of a `Duplex`. Cross-connect two of them with `connectDuplexStreams(a, b)` where you previously wrote `a.pipe(b).pipe(a)`; it returns a detach that stops both directions without ending either endpoint. The channel router — `Muxer.createPort()` and `RpcPort` — is unchanged.

  `WireProtocol` gains a `closed: Event<Error | undefined>`, since a web stream has no `close`/`error` events to listen to. Implementors outside this repo must supply it; a Teleport-backed protocol forwards `teleport.closed`.

  `TestStream` from `@dxos/async/testing` is no longer a `Duplex`: use `stream.readable` / `stream.writable` in place of `pipe`.

  Backpressure is preserved throughout and is now denominated in bytes: the framer reports it via `desiredSize` against a `ByteLengthQueuingStrategy`, the WebRTC transport via `bufferedAmount` / `bufferedAmountLow`, and the TCP transport via the socket's `drain`.

  Hypercore replication is unaffected. `@dxos/vendor-hypercore` dictates a Node stream, so `teleport-extension-replicator` keeps a single explicit `Duplex` bridge; that file and the Node-only TCP transport are the only places the stack still touches Node streams.

  `concatUint8Arrays` is added to `@dxos/util` as the `Buffer.concat` replacement.

  Space and device authentication now compares the auth nonce byte-wise rather than through
  `Buffer.prototype.equals`. The browser `buffer` polyfill's `isBuffer()` rejects a plain
  `Uint8Array` — which is what protobuf decoding yields for `credential.proof.nonce` — and threw
  `TypeError: Argument must be a Buffer`, failing every authentication and so blocking all feed
  replication in the browser. The remaining browser-reachable `Buffer` calls in `edge-client` are
  gone for the same reason: a Node `Buffer` is a `Uint8Array`, so one `instanceof` check covers both
  runtimes, and base64 is decoded with the protobuf wire codec already in use.

  Throughput: Node's web-stream primitives cost a promise and a microtask per chunk, so the framer alone measures ~5x slower than the `Duplex` it replaces (822k -> 126k frames/s at 64B). The full muxer stack peaks at ~27k frames/s, well below that ceiling, so the estimated end-to-end cost is ~18%. Frame batching and a manual pump were both tried and neither helps, because every producer awaits each send.

- 4663f24: Remove the `@dxos/teleport-extension-object-sync` package and the blob-sync teleport extension it
  implemented (peer-to-peer sync of opaque binary blobs), which had no active feature depending on
  it. `SpaceManager`/`SpaceProtocol` no longer accept or thread a `blobStore` option, and
  `DevtoolsHost.getBlobs` (and the devtools "Blobs" panel) are removed along with the underlying
  `dxos.echo.blob`/`dxos.mesh.teleport.blobsync` protobuf definitions. Also deletes 22 other
  protobuf `.proto` files under `@dxos/protocols` (KUBE/DXNS/bot-daemon/pre-Automerge-era message
  and service definitions) confirmed to have zero consumers anywhere in the codebase.
- 2df0297: Client service RPCs are registered with an `RpcRouter` at the bottom of the client-services layer stack instead of being enumerated per connection.

  `RpcRouter` is now a registry of rpc groups that any number of transports serve: `RpcRouter.layer` provides it with no transport, `RpcRouter.layerTransport` attaches the ambient `RpcServer.Protocol`, and a group registered before or after a transport is attached is served either way. A registration can carry an in-process client, and `RpcRouter.client` merges those into one tag-keyed surface with no wire hop.

  Each service registers itself: `RegisterService(rpc, tag)` (`@dxos/client-protocol`) is a layer requiring the service's handler tag and the router, kept separate from the layer that creates the handler. `ServiceStack` is now the whole stack — the components with the RPC services over them — so the per-connection lists are gone along with `layerClientServicesServer`, `layerHandlersFromTag` and `handlersFromStack`: a worker session builds `RpcRouter.layerTransport` over its protocol, and in-process consumers (`LocalClientServices`, diagnostics, tests) source their handlers from the router through `makeClientServicesRpcFromRouter`. `SystemService` depends on the router rather than on every other service tag.

  Also in this change:

  - One open/close state machine backs every transport server in `@dxos/client-protocol`'s `Rpc`, so concurrent opens cannot build two runtimes and a close during startup disposes the runtime that startup created.
  - `normalizeHandlers` resolves each method per call, so an implementation replaced after registration serves subsequent requests.
  - `ServiceContext.services` (test builder) is replaced by the scoped `ServiceContext.rpc`, and `TestBuilder.createClientServer` returns an `Rpc.GroupServer` served off the host's router.

- 3e08678: Rename the WebRTC bridge to `RTCService` and transfer the `RTCDataChannel` to the worker instead of relaying every packet through RPC.

  `RTCDataChannel` is a transferable object on every platform we support, so the tab now hands the established channel straight to the worker and the worker reads and writes it directly. Only signalling crosses the rpc boundary. `RTCService.open` takes the caller's end of a dedicated `MessageChannel` as part of its payload (transferred via effect's worker protocol) and posts the channel to it; the response stream is now purely a stream of signalling messages. The channel cannot ride that stream — a browser only allows an `RTCDataChannel` to be transferred in the task it was created in, and a stream chunk is encoded and sent a task later.

  Removed with it: the `sendData` rpc and its `DataRequest` message, the `BridgeEvent` data/connection-state events, and the duplex relay and manual backpressure callbacks that existed on both sides to carry them. The channel's own send buffer is now the only flow-control signal, applied by a single shared `bindDataChannel` helper used by the direct and proxied transports alike.

  A transferred channel does not deliver its events in the order the creating context would have seen, so that helper attaches the two directions separately: it starts reading on whichever of the first message or the `open` event arrives first, since dropping that first frame stalls the wire protocol's handshake for good, and it starts writing only once the channel is really open, since `send` throws while it is still connecting. A `*.browser.test.ts` suite covers the handover end to end against real Chromium WebRTC and a real worker, and unit tests pin each of those orderings.

  Breaking for embedders that wire the worker themselves:

  - `@dxos/protocols/rpc`: `BridgeService` → `RTCService`; its proto payloads moved from `dxos.mesh.bridge` to `dxos.mesh.rtc` and the `dxos.mesh.bridge.BridgeService` protobuf service is gone (the surface is effect-rpc only).
  - `@dxos/network-manager`: `RtcTransportService` → `RtcService`, now implementing the effect-rpc handlers directly; `RtcTransportProxyFactory.setBridgeService` → `setRtcService`, which takes an `RTCService.Client` rather than a proto-shaped service. `TransportKind.WEB_RTC_PROXY` is gone — the proxy transport needs a real browser now, so it is covered by the browser suite rather than the node `TestBuilder`.
  - `@dxos/client-protocol`: `serveBridgeService`/`makeBridgeServiceClient`/`makeBridgeServiceClientOverProtocol` → `serveRtcService`/`makeRtcServiceClient`/`makeRtcServiceClientOverProtocol`, the latter two now scoped effects rather than promises.
  - `@dxos/client-services`: `WorkerSession.bridgeService` → `rtcService`, `WorkerRuntimeService.connectWebrtcBridge` → `connectWebrtc`.

- f8bfba0: Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

  Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
  Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
  in, and then a new space takes its id from an immutable root document rather than from the space
  key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
  document, and a legacy space is migrated onto a root when it loads, keeping its id.
  `SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
  admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.

### Patch Changes

- a069511: Move the identity, contacts, devices and spaces service RPCs to buf messages, and correct
  `ClientServices` to declare the buf shapes those methods actually carry. The credential subsystem
  keeps its protobuf.js shapes — the payloads cross the RPC boundary as their shared wire bytes — so
  `@dxos/client`'s public API is unchanged.
- 066b35d: Move the devtools snapshot/feed/metadata responses and the invitation device profile to buf
  messages, and correct `ClientServices` to declare the buf shapes those methods carry. `@dxos/echo-client`
  no longer depends on `@dxos/codec-protobuf`. Gossip stays on protobuf.js: announcements cross the network
  between peers, and the two codecs frame an `Any` payload differently.
- 5df602e: Move the wire enums (`EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, `ConnectionState`,
  `DeviceKind`, `DeviceType`) and the remaining `EchoMetadata` decode sites to buf. The enums
  `@dxos/client` re-exports (`SpaceState`, `DeviceKind`, `DeviceType`) are now the buf declarations:
  their members and values are unchanged, but TypeScript enums are nominal, so code comparing one of
  them against the same enum imported from `@dxos/protocols/proto/...` must import it from
  `@dxos/protocols/buf/...` instead.
- 2c5aaf0: Packages whose sources are not safe to bundle for the browser no longer publish a `source` export condition: `@dxos/client-services`, `@dxos/config`, `@dxos/lock-file`, `@dxos/network-manager`, `@dxos/observability`, `@dxos/random-access-storage` and `@dxos/teleport`.

  Default resolution is unchanged — these packages already resolved to their built `dist` for ordinary consumers, and their entry points, types and runtime behaviour are the same. Only resolution under `--conditions=source` changes: it now yields the built output instead of the TypeScript sources in the published `src` directory, so node, bun and Vite all agree on which packages are consumed from source.

- ed9aeba: Host document handles are acquired through ref-counted `DocumentLease`s (`Symbol.dispose`, usable with `using`), and a document is evicted from the repo cache once its last lease is disposed.
- c993432: `EchoHost.updateIndexes` now runs an index pass only when something it reads has changed since the last pass began: a saved document, new feed blocks, or an unfinished batch. A request that finds nothing pending waits for any pass in flight and returns. In production traces 99.6% of passes were such requests, each re-reading every space's feed cursor and every document's heads to index nothing, at a median of 89 ms of worker time.

  Requests are now attributed on the pass span: `rpc-update-indexes` for the client's `DataService.updateIndexes`, `feed-scoped-query` for a feed-scoped query opening, and `epoch` for epoch creation, instead of one label for all three.

  `FeedStore` keeps each space's cursor token in memory after its first read, since the token is written once and every poll validated it with a query.

- ca4429a: Invitation guests now record `dxos.invitation.success`. Previously only the host recorded it, and only on the swarm path, so a space joined through a delegated (EDGE-admitted) invitation — the flow behind Composer share links — produced no success sample at all.

  Every invitation counter (`host`, `success`, `timeout`, `failed`, `expired`) now carries `role` (`host` or `guest`) and `method` (`swarm` or `edge`) tags, so the two peers' samples can be counted separately instead of summing into a double count.

  Guests still record no `timeout` or `failed` counters, so a guest-side failure ratio remains unavailable.

- 505cc1e: Fix invitations failing when the guest's introduce arrived before the host marked the connection connected, and hanging when the first connection closed before the invitation flow started.
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

- 18a59c8: Fix a storage reset that never wiped anything. The reset chain ran on the RPC handler's fiber, and
  its first step closes the stack — and with it the route scope that fiber is forked into — so it was
  interrupted before reaching the wipe. The chain now runs detached, with the handler joining it.
- b7001c2: Make the storage reset single-flight. The reset chain runs on a detached fiber, so a second
  concurrent `SystemService.reset` no longer dies with its caller — it ran the whole
  close/wipe/reset sequence again against a stack the first one had already torn down.
- 8f372ce: Fix spaces imported from a binary space archive returning no results for type queries: imported documents now take the new space's id instead of keeping the exporting space's.
- 631ade3: Fix a space's directory-update context being torn down by another space that shares its root document, and keep an accepted space's anchor retry alive after the invitation context is disposed.
- cd9bf16: Deleting a space now removes it locally even when its teardown fails. Leaving the replication swarm waits on the signaling server, so with EDGE unreachable `space.delete()` rejected after the tombstone had already been written — the space stayed in the client's space list as `SPACE_CLOSED`, and because the tombstone made the deletion look done, retrying was a no-op until the app reloaded.
- ba2cebf: Space archives that contain an empty document now import instead of failing with an invariant violation, and exports no longer write documents that have no local data. The import dialog shows progress and reports failures as a toast, and GitHub pull request actions rejected with a 401 say to reconnect GitHub and link to the connection.
- 2b6eb8d: A space whose automerge root document stalls mid-load (e.g. after a network reconnect during space setup) is now re-driven with a bounded, backing-off retry instead of waiting on a single unbounded `loadDoc` call forever.
- Updated dependencies [a92ea18]
- Updated dependencies [9477170]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [2079755]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [6388838]
- Updated dependencies [f82c78f]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [c01fef6]
- Updated dependencies [bab13fe]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [2d9ecf8]
- Updated dependencies [7575cb6]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [afe2e41]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [915db6a]
- Updated dependencies [020af54]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [9d4dec3]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [4c52ca6]
- Updated dependencies [472ca95]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [34e4fb7]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [5cfa37d]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [707fd04]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [84622b1]
- Updated dependencies [e5c13e4]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [6139557]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [f654860]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [c993432]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [490127e]
- Updated dependencies [851791f]
- Updated dependencies [608a172]
- Updated dependencies [d535d55]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [2bb84d8]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [a09e18e]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [8610d9d]
- Updated dependencies [fc8c80c]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [4bac701]
- Updated dependencies [690dcaa]
- Updated dependencies [14c2fab]
- Updated dependencies [e207c68]
- Updated dependencies [89f2811]
- Updated dependencies [df93cc2]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [16e0588]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [8967ed3]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [a858612]
- Updated dependencies [2374d17]
- Updated dependencies [3e08678]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [631ade3]
- Updated dependencies [2b6eb8d]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [56276cd]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [549e87c]
- Updated dependencies [0b2f04a]
- Updated dependencies [f3756d0]
- Updated dependencies [fce2060]
- Updated dependencies [4fc8f3a]
- Updated dependencies [bda45ac]
- Updated dependencies [ec0803d]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [dac61d5]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [e64e2b5]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [4da1052]
- Updated dependencies [eda8b55]
- Updated dependencies [ceff869]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/echo-host@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/rpc@0.12.0
  - @dxos/feed-store@0.12.0
  - @dxos/network-manager@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/feed@0.12.0
  - @dxos/util@0.12.0
  - @dxos/teleport-extension-replicator@0.12.0
  - @dxos/hypercore@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/teleport@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/keyring@0.12.0
  - @dxos/messaging@0.12.0
  - @dxos/teleport-extension-gossip@0.12.0
  - @dxos/random-access-storage@0.12.0
  - @dxos/timeframe@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/crypto@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-host@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/feed@0.11.1
- @dxos/feed-store@0.11.1
- @dxos/hypercore@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyring@0.11.1
- @dxos/keys@0.11.1
- @dxos/kv-store@0.11.1
- @dxos/lock-file@0.11.1
- @dxos/log@0.11.1
- @dxos/messaging@0.11.1
- @dxos/network-manager@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/random-access-storage@0.11.1
- @dxos/rpc@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/teleport@0.11.1
- @dxos/teleport-extension-gossip@0.11.1
- @dxos/teleport-extension-object-sync@0.11.1
- @dxos/teleport-extension-replicator@0.11.1
- @dxos/timeframe@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1
- @dxos/websocket-rpc@0.11.1

## 0.11.0

### Minor Changes

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- da66270: Fix an unhandled `SqlError` when a hypercore file load races client teardown. If the SQLite connection is torn down while a background `SqliteRandomAccessFile` read is in flight (and that file's own `close()` hasn't run yet), the read now falls back to an empty buffer instead of rethrowing "database connection is not open" as an unhandled rejection.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [b3a3fcf]
- Updated dependencies [4bb7e3b]
- Updated dependencies [41141d8]
- Updated dependencies [da66270]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/feed-store@0.11.0
  - @dxos/hypercore@0.11.0
  - @dxos/lock-file@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/feed@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/keyring@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/teleport-extension-gossip@0.11.0
  - @dxos/teleport-extension-object-sync@0.11.0
  - @dxos/teleport-extension-replicator@0.11.0
  - @dxos/websocket-rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
