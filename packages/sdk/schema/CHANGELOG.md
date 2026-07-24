# @dxos/schema

## 0.11.0

### Patch Changes

- 96109be: `TagIndex` membership now compares tag ids by their entity id rather than their full (space-absolute) URI, so tags applied to feed objects survive a space export/import — the importer mints a new space id, which previously left every stored tag key unmatchable. Absolute keys already in existing spaces keep resolving (no migration), and a relatively-stored key resolves against an absolute query and vice versa.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [f15c632]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/graph@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/random@0.11.0
  - @dxos/invariant@0.11.0
