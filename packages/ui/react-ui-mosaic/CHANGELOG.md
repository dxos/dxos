# @dxos/react-ui-mosaic

## 0.11.0

### Patch Changes

- 0afbf15: Fix mailbox paging and the list blanking during sync. `usePagination` now keeps the previously-shown page across a query-identity change instead of resetting to empty + loading, and the virtualizer pagination hook re-arms `getNext` after a page lands and no longer misreads a reordered item as an eviction. The mailbox renders a loading spinner in-flow at the end of the list rather than replacing the whole panel.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [e510f3b]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
- Updated dependencies [bb63d91]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/log@0.11.0
  - @dxos/random@0.11.0
  - @dxos/invariant@0.11.0
