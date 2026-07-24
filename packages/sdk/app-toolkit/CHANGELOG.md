# @dxos/app-toolkit

## 0.11.0

### Minor Changes

- 30ae5eb: Add stable `data-testid`s across the inbox and connector UI (mailbox sync/reply/message actions, message and conversation tiles, connect dropdown) and an optional `testId` param on `AppNode.makeToolbarActionGroup` / `react-ui-menu`'s menu builder, enabling reliable browser-e2e targeting.
- 9f7d5ad: Replace `CommentConfig.getAnchorLabel` with a typename-keyed `AppCapabilities.AnchorResolver` capability; the assistant companion chat now includes the markdown editor's current selection as request context. Fix view-state persistence so a written value (e.g. a text selection) survives without a live subscriber instead of being garbage-collected back to its default.

### Patch Changes

- 717edc0: `ProgressMeter` now shows a live elapsed-time readout for indeterminate tasks (no known total) instead of a perpetually-pulsing bar; the fractional bar and remaining-time ETA render only when a total is known.
- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [eec72c5]
- Updated dependencies [68e61ca]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [6d2afe0]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [1a989ed]
- Updated dependencies [f15c632]
- Updated dependencies [4df6cf3]
- Updated dependencies [96109be]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [a49131a]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/i18n@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/progress@0.11.0
