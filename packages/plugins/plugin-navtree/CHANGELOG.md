# @dxos/plugin-navtree

## 0.12.0

### Patch Changes

- 9e449df: Fix the L0 rail insetting its items by the scrollbar strip, which narrowed the space around the
  workspace avatars and pushed the active-tab indicator underneath them.
- 3214dcf: **Breaking:** `Graph.expand` is renamed to `Graph.expandSync`, and `Graph.expand` now returns an `Effect` that runs the expansion off the paint-critical path. Both overloads (direct and curried) are preserved on `expandSync`, so migrating is a rename. Interrupting the new `expand` cancels a still-pending expansion, which makes superseding one scheduled expansion with another a matter of interrupting the previous fiber.

  Expanding a node also no longer blocks the main thread on stack-trace capture. `Atom.withLabel` records a stack trace on every call, and the graph labelled an atom per node, per connection key and per extension, so a single expansion cost hundreds of captures — measured at 17ms with 40 registered extensions. Labels are now opt-in via `VITE_ATOM_LABELS` under the dev server.

  The nav-tree's hover prefetch uses the new scheduled `expand` behind a 150ms settle delay, so moving the cursor across rows only expands the row it stops on.

  The tooltip context is split so that pointing at a trigger no longer re-renders every `Tooltip.Trigger` in the app, and the open tooltip's `data-state`/`aria-describedby` are applied to the active trigger alone rather than to all of them.

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [96f94c2]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [5305365]
- Updated dependencies [a3d45c4]
- Updated dependencies [6d28380]
- Updated dependencies [dbff1e4]
- Updated dependencies [b02fe16]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [987f7e1]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [dea5df9]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [886453b]
- Updated dependencies [63629c5]
- Updated dependencies [0c92b44]
- Updated dependencies [32584c9]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [4ae2005]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/plugin-deck@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/util@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-tabs@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/keys@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/random@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-deck@0.11.1
- @dxos/plugin-graph@0.11.1

## 0.11.0

### Patch Changes

- a97a5ca: Show a message in the sidebar when the active workspace is not available instead of rendering an empty nav tree, and stop serializing the unresolved-workspace sentinel into the URL.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [bce1dbc]
- Updated dependencies [e7f0d9e]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [ebb6383]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
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
- Updated dependencies [30ae5eb]
- Updated dependencies [1dad41e]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [105dac4]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-deck@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/random@0.11.0
  - @dxos/debug@0.11.0
