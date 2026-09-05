# @dxos/react-ui-components

## 0.12.0

### Minor Changes

- cc9b81f: `@dxos/react-ui-feed` publishes: the feed engine (a model-driven, anchor-placed virtualized message
  list), the standalone virtualizer (`@dxos/react-ui-feed/virtualizer`), the follow/navigation/
  decoration/selection hooks, and the debug instrumentation (`@dxos/react-ui-feed/debug`). The
  `Outline` rail (formerly `Minimap` in `@dxos/react-ui-components`) now lives there — import it from
  `@dxos/react-ui-feed`. Along the way the rail gained even thinning to any height, a hover card that
  tracks the tick's centre, and keyboard stepping through the host's `onNavigate`.
- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

- 06cbe76: `Timeline`'s `currentBranch` prop is now `branch` (breaking). `Tree` gains a `density` prop that
  sizes its rows and disclosure toggles, replacing the `dx-density-*` class a consumer used to pair
  with it, and row spacing is a gap on the tree rather than a margin on each row, so the first row
  sits flush with the top edge. `Syntax` renders its code as a block and leaves scrolling to
  `Syntax.Viewport`: lines now advance by exactly their `line-height`, so an `Nlh` height cap shows
  N lines, and the code no longer nests a native scrollbar inside the viewport's own.

  The search panel puts its input in a toolbar above the results instead of a statusbar below them.

### Patch Changes

- 6c881a2: Treat query editor tags as atomic chips, keep typed text off them, fix `selectionEnd` never moving the caret, and expand the chess board to fill its card.
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [d2be597]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [9477170]
- Updated dependencies [bcfe4c5]
- Updated dependencies [41e2750]
- Updated dependencies [ebb8f4a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [74f9b30]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/assistant@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-query@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/progress@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/assistant@0.11.1
- @dxos/async@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-query@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1

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
