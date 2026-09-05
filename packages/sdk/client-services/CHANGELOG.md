# @dxos/client-services

## 0.12.0

### Minor Changes

- 4663f24: Remove the `@dxos/teleport-extension-object-sync` package and the blob-sync teleport extension it
  implemented (peer-to-peer sync of opaque binary blobs), which had no active feature depending on
  it. `SpaceManager`/`SpaceProtocol` no longer accept or thread a `blobStore` option, and
  `DevtoolsHost.getBlobs` (and the devtools "Blobs" panel) are removed along with the underlying
  `dxos.echo.blob`/`dxos.mesh.teleport.blobsync` protobuf definitions. Also deletes 22 other
  protobuf `.proto` files under `@dxos/protocols` (KUBE/DXNS/bot-daemon/pre-Automerge-era message
  and service definitions) confirmed to have zero consumers anywhere in the codebase.
- f8bfba0: Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

  Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
  Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
  in, and then a new space takes its id from an immutable root document rather than from the space
  key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
  document, and a legacy space is migrated onto a root when it loads, keeping its id.
  `SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
  admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.

### Patch Changes

- 2c5aaf0: Packages whose sources are not safe to bundle for the browser no longer publish a `source` export condition: `@dxos/client-services`, `@dxos/config`, `@dxos/lock-file`, `@dxos/network-manager`, `@dxos/observability`, `@dxos/random-access-storage` and `@dxos/teleport`.

  Default resolution is unchanged — these packages already resolved to their built `dist` for ordinary consumers, and their entry points, types and runtime behaviour are the same. Only resolution under `--conditions=source` changes: it now yields the built output instead of the TypeScript sources in the published `src` directory, so node, bun and Vite all agree on which packages are consumed from source.

- ed9aeba: Host document handles are acquired through ref-counted `DocumentLease`s (`Symbol.dispose`, usable with `using`), and a document is evicted from the repo cache once its last lease is disposed.
- ca4429a: Invitation guests now record `dxos.invitation.success`. Previously only the host recorded it, and only on the swarm path, so a space joined through a delegated (EDGE-admitted) invitation — the flow behind Composer share links — produced no success sample at all.

  Every invitation counter (`host`, `success`, `timeout`, `failed`, `expired`) now carries `role` (`host` or `guest`) and `method` (`swarm` or `edge`) tags, so the two peers' samples can be counted separately instead of summing into a double count.

  Guests still record no `timeout` or `failed` counters, so a guest-side failure ratio remains unavailable.

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

- 631ade3: Fix a space's directory-update context being torn down by another space that shares its root document, and keep an accepted space's anchor retry alive after the invitation context is disposed.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [c01fef6]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [34e4fb7]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [4bac701]
- Updated dependencies [e207c68]
- Updated dependencies [df93cc2]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [631ade3]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [4fc8f3a]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/echo-host@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/feed@0.12.0
  - @dxos/hypercore@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/keyring@0.12.0
  - @dxos/messaging@0.12.0
  - @dxos/network-manager@0.12.0
  - @dxos/teleport@0.12.0
  - @dxos/teleport-extension-gossip@0.12.0
  - @dxos/teleport-extension-replicator@0.12.0
  - @dxos/websocket-rpc@0.12.0
  - @dxos/feed-store@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/random-access-storage@0.12.0
  - @dxos/timeframe@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/lock-file@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

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
