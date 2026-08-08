# @dxos/react-ui-mosaic

## 1.0.0

### Patch Changes

- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
  - @dxos/echo@1.0.0
  - @dxos/react-ui@1.0.0
  - @dxos/react-ui-menu@1.0.0
  - @dxos/echo-react@1.0.0
  - @dxos/react-ui-search@1.0.0
  - @dxos/react-ui-dnd@1.0.0
  - @dxos/react-ui-syntax-highlighter@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- 0afbf15: Fix mailbox paging and the list blanking during sync. `usePagination` now keeps the previously-shown page across a query-identity change instead of resetting to empty + loading, and the virtualizer pagination hook re-arms `getNext` after a page lands and no longer misreads a reordered item as an eviction. The mailbox renders a loading spinner in-flow at the end of the list rather than replacing the whole panel.
- 5585ec8: Fix `Mosaic.Tile` not applying a `size` prop that arrives (or changes) after the first render — a tile mounted without a size (e.g. before a responsive breakpoint settles, or across a layout branch switch) now re-syncs to the prop instead of staying stuck at its initial extent.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/random@0.11.0
  - @dxos/invariant@0.11.0
