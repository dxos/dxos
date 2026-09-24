---
'@dxos/react-ui-list': minor
---

A windowed `Tree` now windows trees with branches too: an open branch's children mount as rows after their parent, so hierarchical task lists and the process tree mount only the rows in view. Keyboard navigation reaches rows outside the window, and the tree keeps its "drop after the last row" target. A windowed list also holds the reader's place when rows are inserted or removed above the view. Breaking: `useWindow` from `@dxos/react-ui-virtual` now identifies each mounted row by `data-window-id` instead of `data-object-id`, so a host that renders its own rows must spread the new `windowRowProps(index, id)` onto each one.
