---
'@dxos/react-ui-attention': patch
'@dxos/plugin-inbox': patch
---

The inbox message view selector (HTML / Markdown / Plain) now persists across messages and sessions. The choice is stored per-device via react-ui-attention view state (localStorage backend) instead of resetting to HTML on every open. Also reorganizes `useArticleKeyboardNavigation` under `AttentionProvider` (no change to the `@dxos/react-ui-attention` public exports).
