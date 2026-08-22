# @dxos/react-ui-assistant

## 0.12.0

### Minor Changes

- 4cb12a9: The virtualizer graduates to `@dxos/react-ui-virtual` (anchor-relative placement, `useWindow`/`Window`, the follow aspect, and the told-model `ListModel`), and the assistant chat surface ships as `@dxos/react-ui-assistant` — the `ChatThread` composite on the feed engine, with the view-typed renderer, the XML widget registry, and the prompt/answer chrome. `@dxos/react-ui-feed` now depends on `@dxos/react-ui-virtual` and no longer exposes its `/virtualizer` entry point.

### Patch Changes

- 0a7d273: MessageChrome no longer throws when rendered without its provider; the context now defaults to empty so the chrome degrades to its default behavior instead of crashing the thread.
- 89bca65: Render an assistant `<reference>` tag inline so surrounding prose flows around it.
- Updated dependencies [e2eecf2]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [e094f74]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [d62a947]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [557e243]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [6c881a2]
- Updated dependencies [cc9b81f]
- Updated dependencies [4cb12a9]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [cc11297]
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/types@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/react-ui-feed@0.12.0
  - @dxos/react-ui-syntax-highlighter@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/util@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/ui-theme@0.12.0
