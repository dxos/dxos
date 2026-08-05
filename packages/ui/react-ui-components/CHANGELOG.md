# @dxos/react-ui-components

## 0.11.0

### Minor Changes

- ba7aabf: Add `Html`, a sandboxed renderer for untrusted HTML: sanitized content in a Shadow DOM host, so the document's CSS cannot reach the app while it still flows in the app layout, with remote images blocked by default. Content-specific behaviour is supplied as an `HtmlDialect` — a plain value carrying CSS, transforms and a `src` resolver — rather than baked into the component; `emailDialect()` is the first of these. `plugin-inbox`'s `HtmlViewer` is replaced by that pair, moving `cid:` attachment resolution into the plugin (`useCidResolver`) so the shared UI package no longer depends on ECHO.

  Email bodies now honour the sender's `color-scheme` declaration, read from the raw markup before sanitization strips it: a body declaring `light` is left as authored on a light sheet in dark mode, and anything undeclared is recolored to the app theme regardless of layout (the previous table-layout exemption preserved too little to justify leaving marketing mail glaring white in dark mode).

- 801b77f: Add a `Minimap` component (`@dxos/react-ui-components`): a vertical rail of ticks representing anchor markers in a scrollable document, with a wave hover animation, per-marker popover, and brighter ticks for the currently-visible range.

  `MarkdownStreamController` gains `scrollTo`, `getVisibleRange`, and `onVisibleRangeChange`. In `plugin-assistant` the chat thread now renders a `Chat.Minimap` rail (one tick per prompt turn, scrolls to the turn on click), and prompt prev/next navigation steps through the prompt range table rather than the xml-tag widget bookmarks.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [59a65a8]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/echo-query@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
