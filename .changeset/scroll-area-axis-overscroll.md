---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

A ScrollArea contains overscroll only along the axis it scrolls, so a vertical two-finger swipe over a horizontally scrolling area (such as the project timeline's chart) scrolls the panel around it instead of being swallowed.
