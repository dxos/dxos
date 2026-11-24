---
'@dxos/react-ui': patch
---

A `Tree` (and so a `TaskList`) that is not height-bound no longer stops the wheel from scrolling the page around it; a tree that overflows its own viewport still contains overscroll.
