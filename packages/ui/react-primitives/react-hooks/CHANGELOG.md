# @dxos/react-hooks

## 0.12.0

### Patch Changes

- 77d0026: Fixed `useMediaQuery` ignoring changes to its `query` argument — the hook kept tracking the original media query for the component's lifetime; it now re-subscribes when the query changes and matches change events against the browser-normalized query string.
- Updated dependencies [e8088ea]
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/log@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/log@0.11.0
