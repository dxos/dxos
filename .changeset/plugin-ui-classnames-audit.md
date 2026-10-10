---
'@dxos/plugin-markdown': patch
---

Composer plugins lay out their panels with react-ui's `Layout.Flex` / `Layout.Grid` and theme colour tokens instead of hand-written flex/grid classes and raw palette colours, so status colours now follow the theme in light and dark mode.
