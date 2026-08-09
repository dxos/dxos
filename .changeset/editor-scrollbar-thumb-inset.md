---
'@dxos/ui-editor': patch
---

Keep the editor scrollbar thumb inset from the edge while hovered or scrolling. The `background`
shorthand reset `background-clip` to `border-box`, painting over the transparent border that forms
the inset exactly when the thumb became visible.
