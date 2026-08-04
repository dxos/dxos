---
'@dxos/react-ui': patch
'@dxos/plugin-markdown': patch
---

Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
