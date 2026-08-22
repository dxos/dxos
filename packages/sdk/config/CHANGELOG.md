# @dxos/config

## 0.12.0

### Patch Changes

- 069e8ed: Give the CLI's `main` profile template full parity with Composer's local dev config (edge, ICE, sandbox, IPFS), and auto-default new profiles to it when running the CLI from a monorepo checkout via `DX_LOCAL_DEV`.
- 48ea128: Resolve the hub URL outside the browser: `DX_HUB_URL` and other `DX_*` environment variables now
  apply to node config loads, `runtime.services.hub.url` and a built-in default back up
  `runtime.app.env.DX_HUB_URL`, and `dx account` commands no longer fail with "Hub URL not
  configured".
- Updated dependencies [4e417e9]
- Updated dependencies [23d2d8c]
- Updated dependencies [e56276b]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/log@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/util@0.12.0

## 0.11.1

### Patch Changes

- @dxos/client-protocol@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 41141d8: Default edge replication to the Subduction sedimentree transport: the built-in client config now enables `edgeFeatures.subductionReplicator` instead of `edgeFeatures.echoReplicator`. Set `subductionReplicator: false` (and `echoReplicator: true`) to restore the previous Automerge edge replicator.

### Patch Changes

- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/log@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
