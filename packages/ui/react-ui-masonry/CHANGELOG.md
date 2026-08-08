# @dxos/react-ui-masonry

## 1.0.0

### Patch Changes

- Updated dependencies [557e243]
- Updated dependencies [557e243]
  - @dxos/react-ui@1.0.0
  - @dxos/ui-theme@1.0.0

## 0.11.1

### Patch Changes

- @dxos/echo-react@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-types@0.11.1

## 0.11.0

### Minor Changes

- 9ded6b9: Masonry no longer flashes a bunched, overlapping stack on the initial render of a large set: unmeasured tiles now use an estimated height so the first layout is already spaced into columns, and the grid stays hidden until the layout settles before fading in (respecting `prefers-reduced-motion`). Reflow animation is limited to small add/remove edits — the initial render, bulk data swaps, and resizes snap instead of animating — and a new `animate` prop on `Masonry.Root` disables animation entirely.

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/random@0.11.0
