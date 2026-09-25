---
'@dxos/react-hooks': patch
---

Fixed `useMediaQuery` ignoring changes to its `query` argument — the hook kept tracking the original media query for the component's lifetime; it now re-subscribes when the query changes and matches change events against the browser-normalized query string.
