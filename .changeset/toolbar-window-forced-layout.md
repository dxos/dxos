---
'@dxos/react-ui-menu': patch
'@dxos/react-ui-virtual': patch
---

`ActionToolbar` measures overflow only when its items, collapse count or frame width change, and skips the read when nothing can collapse, so toolbars no longer force a layout on every render. `useWindow` reports the viewport from `Placement` instead of reading the DOM during render, and re-announces `onChange` when the viewport changes. `Placement` gains a read-only `viewport` getter.
