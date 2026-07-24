# @dxos/plugin-versioning

## 0.11.0

### Minor Changes

- 77fff35: Extract the generic version/review layer out of `@dxos/plugin-space` into a new `@dxos/plugin-versioning` system (core) plugin. The history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model now live in `@dxos/plugin-versioning` under the `VersioningCapabilities` namespace (previously `SpaceCapabilities`). Consumers import these symbols from `@dxos/plugin-versioning`; `plugin-space` no longer depends on `@dxos/versioning`. `VersioningPlugin` is a core plugin, auto-included by composer-app. (Sibling `@dxos/plugin-space` / `@dxos/plugin-markdown` / `@dxos/plugin-comments` bump via the fixed release group.)

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [801b77f]
- Updated dependencies [717edc0]
- Updated dependencies [4df6cf3]
- Updated dependencies [96109be]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/versioning@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/log@0.11.0
