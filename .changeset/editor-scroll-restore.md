---
'@dxos/ui-editor': patch
'@dxos/plugin-markdown': patch
---

Restore a markdown document's scroll position when navigating back to it: the position is now recorded as you scroll (not only when the caret moves), read back on mount, and re-anchored to the exact pixel rather than the enclosing line.
