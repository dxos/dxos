# @dxos/react-ui-feed

## 0.12.0

### Minor Changes

- cc9b81f: `@dxos/react-ui-feed` publishes: the feed engine (a model-driven, anchor-placed virtualized message
  list), the standalone virtualizer (`@dxos/react-ui-feed/virtualizer`), the follow/navigation/
  decoration/selection hooks, and the debug instrumentation (`@dxos/react-ui-feed/debug`). The
  `Outline` rail (formerly `Minimap` in `@dxos/react-ui-components`) now lives there — import it from
  `@dxos/react-ui-feed`. Along the way the rail gained even thinning to any height, a hover card that
  tracks the tick's centre, and keyboard stepping through the host's `onNavigate`.
- 4cb12a9: The virtualizer graduates to `@dxos/react-ui-virtual` (anchor-relative placement, `useWindow`/`Window`, the follow aspect, and the told-model `ListModel`), and the assistant chat surface ships as `@dxos/react-ui-assistant` — the `ChatThread` composite on the feed engine, with the view-typed renderer, the XML widget registry, and the prompt/answer chrome. `@dxos/react-ui-feed` now depends on `@dxos/react-ui-virtual` and no longer exposes its `/virtualizer` entry point.

### Patch Changes

- Updated dependencies [96f94c2]
- Updated dependencies [a1075de]
- Updated dependencies [f3f55a8]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [12b6618]
- Updated dependencies [41e2750]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [d4b4919]
- Updated dependencies [cd4da46]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [4cb12a9]
- Updated dependencies [1d6f730]
- Updated dependencies [f962a7d]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [d8e9de1]
- Updated dependencies [32584c9]
- Updated dependencies [97efbaa]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-virtual@0.12.0
  - @dxos/types@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/ui-theme@0.12.0
