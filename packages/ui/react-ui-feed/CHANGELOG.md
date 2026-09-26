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

- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [a1075de]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [f3f55a8]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [cff33b7]
- Updated dependencies [b83b831]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [5b99c47]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [12b6618]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [557e243]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [d4b4919]
- Updated dependencies [cd4da46]
- Updated dependencies [ec4f4ca]
- Updated dependencies [d1a69fb]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [4cb12a9]
- Updated dependencies [a574300]
- Updated dependencies [1d6f730]
- Updated dependencies [f962a7d]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [32584c9]
- Updated dependencies [3ea8217]
- Updated dependencies [1862edc]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [928e0b2]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [b2a44d6]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-virtual@0.12.0
  - @dxos/types@0.12.0
  - @dxos/ui-editor@0.12.0
