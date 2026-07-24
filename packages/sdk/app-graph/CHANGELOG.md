# @dxos/app-graph

## 0.11.0

### Minor Changes

- 68e61ca: Drive connector-auth ("Connect X") toolbar actions from a `ConnectorAuthAnnotation` schema annotation, resolved by a single app-graph extension in plugin-connector — replacing the per-plugin `connectorAuthExtension` helper (removed). Owning plugins inline their own sync/generate toolbar actions. Adds `actionGroups` to `GraphBuilder.createExtension`/`createTypeExtension` and a `primary` menu-action variant.
- 1a989ed: Graph actions can now declare `disposition` as an array and a `presentation` chrome override per surface, letting one action multi-target the object toolbar and nav-tree context menu with appropriate chrome in each. Mailbox and calendar "Sync" now surface from a single graph action instead of a duplicated toolbar button.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
