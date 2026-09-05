# @dxos/echo-host

## 0.12.0

### Minor Changes

- f8bfba0: Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

  Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
  Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
  in, and then a new space takes its id from an immutable root document rather than from the space
  key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
  document, and a legacy space is migrated onto a root when it loads, keeping its id.
  `SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
  admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.

### Patch Changes

- ed9aeba: Host document handles are acquired through ref-counted `DocumentLease`s (`Symbol.dispose`, usable with `using`), and a document is evicted from the repo cache once its last lease is disposed.
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
- 4fc8f3a: Stop re-persisting already-stored Automerge data on startup, and halve the indexer's per-pass reads.

  **Reload no longer rewrites the whole document history.** `SubductionSource` dedupes writes against `entry.knownHashes`, which starts empty every process and was never seeded from disk, so the first save after reattaching a document treated its entire on-disk sedimentree as new and wrote all of it back. The pinned `@automerge/automerge-repo@2.6.0-subduction.40` patch now mirrors the attach-time hash scan into `knownHashes` (ports upstream automerge/automerge-repo#712). Measured on a real profile, `subduction-commits-*` / `subduction-fragments-*` inserts on boot drop to zero.

  Note this does not cover `subduction-remote-heads-*` records, which are deduped through a separate in-memory cache with the same cold-start blindness and are still rewritten each boot.

  **Indexer reads halved per pass.** Document heads are read once per `IndexEngine.update` and shared across the `fts5` and `reverseRef` indexes instead of being re-scanned for each, and each source's cursors load in a single statement rather than one per index. Cursor state remains per-index, so what gets indexed is unchanged; the heads snapshot lives only for the duration of one pass, so it cannot go stale. On a real boot this took `indexCursor` from 4 to 2 reads and the unbounded `automerge_heads` scan from 2 to 1 per pass.

  The index-pass completion log now reports `reasons`, `durationMs`, and `invalidates`, attributing each run to what scheduled it — `DeferredTask` coalesces callers, so the reason is recorded as a multiset.

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
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [34e4fb7]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
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
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [df93cc2]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [4fc8f3a]
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
  - @dxos/sql-sqlite@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/feed@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/index-core@0.12.0
  - @dxos/util@0.12.0
  - @dxos/teleport@0.12.0
  - @dxos/teleport-extension-automerge-replicator@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/typings@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/crypto@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/feed@0.11.1
- @dxos/index-core@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/kv-store@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/teleport@0.11.1
- @dxos/teleport-extension-automerge-replicator@0.11.1
- @dxos/timeframe@0.11.1
- @dxos/tracing@0.11.1
- @dxos/typings@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- ae18615: Resolve a replicated document's containing space from local collection membership in the share policy, so a document whose handle is evicted or still loading is no longer falsely reported as belonging to no space, removing the false share-policy denials and the replication stalls they caused on both the edge/subduction and mesh replication paths.

  Additionally, the subduction WASM console log level is set to `error` once the repo is constructed. Subduction syncs every document with every connected peer, so with multiple spaces each space-scoped edge peer is asked for every foreign document and correctly denied — and subduction_core logged each denial as a `not authorized to access sedimentree` warning, flooding the console (dispatch-scoping gap tracked as DX-1121). Set `localStorage.debug` to a value matching `subduction` (or set `globalThis.__SUBDUCTION_DEBUG`) to restore verbose WASM logging when debugging.

  Breaking: `createIdFromSpaceKey` is no longer re-exported from `@dxos/echo-host`; import it from `@dxos/echo-protocol` instead.

- 14983db: Move the space protocol, control/feed pipeline, and metadata store out of `@dxos/echo-host` into `@dxos/client-services`. `@dxos/echo-host` now exposes only `EchoHost` and its Automerge/database implementation. Consumers of `SpaceManager`, `SpaceProtocol`, `Space`, `AuthProvider`/`AuthVerifier`, `Pipeline`, `MetadataStore`, `SqliteMetadataStore`, `createMappedFeedWriter`, and `valueEncoding` must now import them from `@dxos/client-services` (test helpers from `@dxos/client-services/testing`).

### Patch Changes

- da66270: Fix silent stalls in subduction edge replication. Reconnects now run a clean connection restart (no unbounded re-subscribe loop) and replaced connections close immediately so in-flight sync rounds settle and re-drive promptly; the keepalive watchdog no longer false-restarts a healthy connection when the event loop is CPU-pinned by bulk sync. Client-side frame batching plus an in-flight sync gate and reconnect re-drive (automerge-repo patch) let large host→edge→guest replications complete reliably instead of wedging.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [7b270f2]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/index-core@0.11.0
  - @dxos/log@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/feed@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/teleport-extension-automerge-replicator@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
  - @dxos/typings@0.11.0
