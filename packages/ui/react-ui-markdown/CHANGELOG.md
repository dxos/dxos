# @dxos/react-ui-markdown

## 0.11.0

### Minor Changes

- 801b77f: Add a `Minimap` component (`@dxos/react-ui-components`): a vertical rail of ticks representing anchor markers in a scrollable document, with a wave hover animation, per-marker popover, and brighter ticks for the currently-visible range.

  `MarkdownStreamController` gains `scrollTo`, `getVisibleRange`, and `onVisibleRangeChange`. In `plugin-assistant` the chat thread now renders a `Chat.Minimap` rail (one tick per prompt turn, scrolls to the turn on click), and prompt prev/next navigation steps through the prompt range table rather than the xml-tag widget bookmarks.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [a256a87]
- Updated dependencies [a31ef40]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
  - @dxos/echo@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/invariant@0.11.0
