---
'@dxos/react-ui-list': patch
---

A windowed `Tree` now windows trees with branches too: an open branch's children mount as rows of the window after their parent, so hierarchical task lists and the process tree mount only the rows in view. A windowed tree also keeps its "drop after the last row" target.
