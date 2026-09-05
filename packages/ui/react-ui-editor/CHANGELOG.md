# @dxos/react-ui-editor

## 0.12.0

### Patch Changes

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- Updated dependencies [96f94c2]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [b02fe16]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [bf4f1e6]
- Updated dependencies [41e2750]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [3214dcf]
- Updated dependencies [d4b4919]
- Updated dependencies [987f7e1]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
  - @dxos/react-ui@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-graph@0.11.1
- @dxos/async@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 2e10525: The editor's object picker is now a combobox: the query is typed into a search input in the popover instead of into the document, opted into per trigger via `searchTriggers`. In markdown, the picker sorts objects by name and leads with a generic "Add object" that opens the create-object dialog and inserts a link to whatever it creates. Links to internal objects no longer show a raw-URI hover tooltip.

### Patch Changes

- 53fde97: Bump CodeMirror packages (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`) to their latest patch releases.
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [717edc0]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [717edc0]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [59a65a8]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a1c89fa]
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/invariant@0.11.0
