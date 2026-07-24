# @dxos/react-ui-attention

## 0.11.0

### Patch Changes

- 3b4a7c8: The inbox message view selector (HTML / Markdown / Plain) now persists across messages and sessions. The choice is stored alongside the other inbox settings (the `loadRemoteImages` toggle) in the plugin's settings store, so it survives reloads instead of resetting to HTML on every open. Also reorganizes `useArticleKeyboardNavigation` under `AttentionProvider` (no change to the `@dxos/react-ui-attention` public exports).
- 9f7d5ad: Replace `CommentConfig.getAnchorLabel` with a typename-keyed `AppCapabilities.AnchorResolver` capability; the assistant companion chat now includes the markdown editor's current selection as request context. Fix view-state persistence so a written value (e.g. a text selection) survives without a live subscriber instead of being garbage-collected back to its default.
- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/log@0.11.0
  - @dxos/invariant@0.11.0
