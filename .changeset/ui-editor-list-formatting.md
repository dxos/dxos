---
'@dxos/ui-editor': patch
---

Fix markdown list formatting: toggling between bullet/task/ordered list styles now converts markers in place instead of nesting them, list markers align with the hanging indent, and the outliner block drag shows a full-width preview with a stable empty drop placeholder (no flicker when dragging items with children).
