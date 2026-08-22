# @dxos/echo-host

## 0.12.0

### Patch Changes

- 4fc8f3a: Stop re-persisting already-stored Automerge data on startup, and halve the indexer's per-pass reads.

  **Reload no longer rewrites the whole document history.** `SubductionSource` dedupes writes against `entry.knownHashes`, which starts empty every process and was never seeded from disk, so the first save after reattaching a document treated its entire on-disk sedimentree as new and wrote all of it back. The pinned `@automerge/automerge-repo@2.6.0-subduction.40` patch now mirrors the attach-time hash scan into `knownHashes` (ports upstream automerge/automerge-repo#712). Measured on a real profile, `subduction-commits-*` / `subduction-fragments-*` inserts on boot drop to zero.

  Note this does not cover `subduction-remote-heads-*` records, which are deduped through a separate in-memory cache with the same cold-start blindness and are still rewritten each boot.

  **Indexer reads halved per pass.** Document heads are read once per `IndexEngine.update` and shared across the `fts5` and `reverseRef` indexes instead of being re-scanned for each, and each source's cursors load in a single statement rather than one per index. Cursor state remains per-index, so what gets indexed is unchanged; the heads snapshot lives only for the duration of one pass, so it cannot go stale. On a real boot this took `indexCursor` from 4 to 2 reads and the unbounded `automerge_heads` scan from 2 to 1 per pass.

  The index-pass completion log now reports `reasons`, `durationMs`, and `invalidates`, attributing each run to what scheduled it — `DeferredTask` coalesces callers, so the reason is recorded as a multiset.

- Updated dependencies [e2eecf2]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [a3b6ef0]
- Updated dependencies [34e4fb7]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [d62a947]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [5ceaf9c]
- Updated dependencies [8ca2ac7]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [256f286]
- Updated dependencies [df93cc2]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [4fc8f3a]
- Updated dependencies [881f900]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [cc11297]
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/feed@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/index-core@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/teleport@0.12.0
  - @dxos/teleport-extension-automerge-replicator@0.12.0
  - @dxos/async@0.12.0
  - @dxos/codec-protobuf@0.12.0
  - @dxos/context@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/log@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/typings@0.12.0
  - @dxos/util@0.12.0

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
