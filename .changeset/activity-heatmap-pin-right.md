---
'@dxos/react-ui-dashboard': patch
---

`Dashboard.Activity` no longer scrolls horizontally: when the weeks overflow the available width, the oldest weeks are clipped on the left so the most recent weeks stay pinned to the right, with day labels always visible.
