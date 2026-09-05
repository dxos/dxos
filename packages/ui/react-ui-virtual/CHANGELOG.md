# @dxos/react-ui-virtual

## 0.12.0

### Minor Changes

- 4cb12a9: The virtualizer graduates to `@dxos/react-ui-virtual` (anchor-relative placement, `useWindow`/`Window`, the follow aspect, and the told-model `ListModel`), and the assistant chat surface ships as `@dxos/react-ui-assistant` — the `ChatThread` composite on the feed engine, with the view-typed renderer, the XML widget registry, and the prompt/answer chrome. `@dxos/react-ui-feed` now depends on `@dxos/react-ui-virtual` and no longer exposes its `/virtualizer` entry point.

### Patch Changes

- a1075de: Assistant chat UI fixes. The outline rail lists one tick per prompt again — tool results travel back as user-role messages carrying a synthetic text block, so filtering on the role alone added a tick per tool call, titled from raw `<result>` markup, and cut each turn's range short at its first tool call. The thread gains a floating scroll-to-bottom button, which `useFollow` supports by publishing `atEnd` as state and `MessageList.Viewport` by taking an `overlay` slot. Suggestion chips are capped by the column they render in rather than the viewport, and are spaced by their own padding rather than a separator character that wrapped onto the next row. The chat options Skills and Objects lists sit flush to the popover edge, via ScrollArea knobs `SearchList.Viewport` now forwards. XML-tag widgets force a bounded parse on their first decoration build, so a remounted feed row does not show raw markup while the background parser catches up. A multi-step turn now renders as one tool panel rather than a card per call: the thread's projection folds each run of tool-only messages into one message (the runtime delivers one block per message), and the panel shows a row per call — naming the call in flight while the turn is live, then counting the run once it settles.
- Updated dependencies [96f94c2]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
  - @dxos/react-ui@0.12.0
  - @dxos/ui-theme@0.12.0
