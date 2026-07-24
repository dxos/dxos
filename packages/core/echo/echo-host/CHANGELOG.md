# @dxos/echo-host

## 0.11.0

### Minor Changes

- ae18615: Resolve a replicated document's containing space from local collection membership in the share policy, so a document whose handle is evicted or still loading is no longer falsely reported as belonging to no space, removing the false share-policy denials and the replication stalls they caused on both the edge/subduction and mesh replication paths.

  Additionally, the subduction WASM console log level is set to `error` once the repo is constructed. Subduction syncs every document with every connected peer, so with multiple spaces each space-scoped edge peer is asked for every foreign document and correctly denied — and subduction_core logged each denial as a `not authorized to access sedimentree` warning, flooding the console (dispatch-scoping gap tracked as DX-1121). Set `localStorage.debug` to a value matching `subduction` (or set `globalThis.__SUBDUCTION_DEBUG`) to restore verbose WASM logging when debugging.

  Breaking: `createIdFromSpaceKey` is no longer re-exported from `@dxos/echo-host`; import it from `@dxos/echo-protocol` instead.

- 14983db: Move the space protocol, control/feed pipeline, and metadata store out of `@dxos/echo-host` into `@dxos/client-services`. `@dxos/echo-host` now exposes only `EchoHost` and its Automerge/database implementation. Consumers of `SpaceManager`, `SpaceProtocol`, `Space`, `AuthProvider`/`AuthVerifier`, `Pipeline`, `MetadataStore`, `SqliteMetadataStore`, `createMappedFeedWriter`, and `valueEncoding` must now import them from `@dxos/client-services` (test helpers from `@dxos/client-services/testing`).

### Patch Changes

- da66270: Fix silent stalls in subduction edge replication. Reconnects now run a clean connection restart (no unbounded re-subscribe loop) and replaced connections close immediately so in-flight sync rounds settle and re-drive promptly; the keepalive watchdog no longer false-restarts a healthy connection when the event loop is CPU-pinned by bulk sync. Client-side frame batching plus an in-flight sync gate and reconnect re-drive (automerge-repo patch) let large host→edge→guest replications complete reliably instead of wedging.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/index-core@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/feed@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/teleport-extension-automerge-replicator@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
  - @dxos/typings@0.11.0
