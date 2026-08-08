# @dxos/react-ui-menu

## 1.0.0

### Major Changes

- 4f760ce: `Menu.Toolbar` no longer renders the graph items implicitly — it is now only the attention-gated toolbar container, and the new `Menu.Items` renders the graph-backed items wherever it sits among the toolbar's children, so JSX order controls placement. Every `<Menu.Toolbar />` becomes `<Menu.Toolbar><Menu.Items /></Menu.Toolbar>`; a toolbar mixing its own children with the graph items orders them freely.

### Patch Changes

- Updated dependencies [557e243]
- Updated dependencies [557e243]
  - @dxos/react-ui@1.0.0
  - @dxos/app-graph@1.0.0
  - @dxos/keyboard@1.0.0
  - @dxos/react-ui-attention@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/log@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/ui-types@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/app-graph@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/log@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- bb63d91: Clean up inbox operations: remove unused `DeleteEmail`, `DeleteEvent`, `SyncDraftEvents`, `SyncContacts` operations and the dead `tool-ids.ts` file. Deprecate `ExtractContact` and `ExtractMailbox`. Add a defensive double-click guard to toolbar action buttons — they now disable while the handler is in-flight.

### Patch Changes

- Updated dependencies [5585ec8]
- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/app-graph@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/util@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
