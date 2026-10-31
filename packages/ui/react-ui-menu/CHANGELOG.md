# @dxos/react-ui-menu

## 0.17.0

### Minor Changes

- e1d537b: `ActionToolbar` lays out start and end zones and multiple rows, and ends with an overflow menu (⋮) that takes collapsible groups as submenus while a row is too narrow. Items and groups say where they go with `placement` (`ToolbarPlacement` on `MenuItemChrome`). A plain named group renders inline in a toolbar and as a submenu in a menu; another component extends it with `MenuBuilder.extend(groupId, …)`, including the overflow menu (`TOOLBAR_OVERFLOW_ID`). `EditorToolbar` declares an insert group (`EDITOR_TOOLBAR_INSERT_GROUP`) and an overflow menu for consumers to extend. `Editor.ToolbarMenu` renders the same actions as a menu; in a menu the overflow group's items follow the others instead of nesting.

  Breaking: `ActionToolbar` no longer takes `children` or `start`. Add hand-written controls as `custom` items (`MenuBuilder.custom`) and labels as `text` items (`MenuBuilder.text`); another component extends a toolbar through `customActions`, now a prop of `ActionToolbar` itself.

  Presenter slides gain two layouts, `three-cols` (`::middle::`, `::right::`) and `two-by-two` (`::right::`, `::bottom-left::`, `::bottom-right::`); "Start next column" inserts the marker of the column after the cursor's.

### Patch Changes

- e7ca5d7: `ActionToolbar` measures overflow only when its items, collapse count or frame width change, and skips the read when nothing can collapse, so toolbars no longer force a layout on every render. `useWindow` reports the viewport from `Placement` instead of reading the DOM during render, and re-announces `onChange` when the viewport changes. `Placement` gains a read-only `viewport` getter.
- 1a0fff1: Keep guided tours working on a narrow plank: a step pointing at a toolbar control now opens the overflow menu when the toolbar has folded that control away, and a step whose target never appears is stepped over rather than ending the tour.
- Updated dependencies [caa28b3]
- Updated dependencies [df16fba]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9d66bcd]
- Updated dependencies [17a9e75]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [4fe25ee]
- Updated dependencies [7da5d17]
- Updated dependencies [ca2a4a8]
- Updated dependencies [d00cc85]
- Updated dependencies [1a0fff1]
- Updated dependencies [e67aa80]
  - @dxos/app-graph@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/react-ui-attention@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/util@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/graph@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-focus@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/app-graph@0.16.0
  - @dxos/react-ui-attention@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/graph@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/react-focus@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [55bdf55]
- Updated dependencies [25af912]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
  - @dxos/react-ui@0.15.0
  - @dxos/app-graph@0.15.0
  - @dxos/react-ui-attention@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/graph@0.15.0
  - @dxos/util@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/log@0.15.0
  - @dxos/react-focus@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [1819960]
- Updated dependencies [b07f49f]
  - @dxos/react-ui@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/app-graph@0.14.0
  - @dxos/react-ui-attention@0.14.0
  - @dxos/graph@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0
  - @dxos/react-focus@0.14.0
  - @dxos/ui-types@0.14.0

## 0.13.0

### Minor Changes

- 64f1a7a: The pull request type opens as a triage list of every pull request in the space, showing each one's repository, title, CI checks, tracking tasks and state, ordered by relevance or time; its filter, sort and grouping persist per device. `@dxos/react-ui-menu` gains generic `SortMenu`/`GroupMenu`, `@dxos/react-ui-query` gains `usePersistentQuery`, and `PullRequest` now records GitHub's `createdAt`/`updatedAt`.

### Patch Changes

- ecd099a: A deferred `ActionMenu` (`deferUntilOpen`) no longer builds its action graph until it is first opened, so a list that renders one per row mounts each row without creating a graph per menu.
- Updated dependencies [d2a6aad]
- Updated dependencies [cb1e218]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
- Updated dependencies [1b37aa8]
- Updated dependencies [321c99f]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/util@0.13.0
  - @dxos/react-ui-attention@0.13.0
  - @dxos/app-graph@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/graph@0.13.0
  - @dxos/log@0.13.0
  - @dxos/react-focus@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Minor Changes

- 4f760ce: `Menu.Toolbar` no longer renders the graph items implicitly — it is now only the attention-gated toolbar container, and the new `Menu.Items` renders the graph-backed items wherever it sits among the toolbar's children, so JSX order controls placement. Every `<Menu.Toolbar />` becomes `<Menu.Toolbar><Menu.Items /></Menu.Toolbar>`; a toolbar mixing its own children with the graph items orders them freely.

### Patch Changes

- 1a3de22: Fix the command palette and search dialog keyboard contract. Both now focus their input on open
  (so Enter runs the highlighted entry instead of the dialog's Close button), keep the first result
  highlighted as the query changes, and close on Escape rather than only clearing the query.
  `Picker.Input`/`SearchList.Input` gain `escapeBehavior`, `SearchList.Root` gains
  `resetSelectionOnChange`, and `resolveKeyBinding` in `@dxos/util` applies the platform fallbacks
  everywhere a shortcut hint is rendered — shortcuts were blank on Linux despite firing.
- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [f4e481a]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [b02fe16]
- Updated dependencies [472ca95]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [098a0bb]
- Updated dependencies [882ac2a]
- Updated dependencies [bf4f1e6]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [efdcf61]
- Updated dependencies [07531e0]
- Updated dependencies [3214dcf]
- Updated dependencies [a04ab6e]
- Updated dependencies [d4b4919]
- Updated dependencies [b1bb838]
- Updated dependencies [987f7e1]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [6dadb41]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/invariant@0.12.0

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
