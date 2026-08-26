---
'@dxos/react-ui': patch
---

Fix `Popover.Arrow` never rendering: the popover content clipped its own overflow, and Radix positions the arrow as a child of the content straddling that edge. Clipping now lives on `Popover.Viewport`, which is the box that scrolls and carries the rounded corners.
