---
'@dxos/react-ui-virtual': patch
---

A virtualized list re-measures a row that resizes without a commit of its own, such as a card whose surface fills in late, before the frame paints. A list pinned to its end no longer jumps a row after it loads.
