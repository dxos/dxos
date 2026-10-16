---
'@dxos/plugin-sheet': minor
'@dxos/react-ui-grid': patch
---

Every sheet gets a Charts companion that charts its ranges as bar, pie, or xy plots, saved on the sheet in a new optional `charts` field, and sheets publish their selected range through the shared `Selection` view state so companions can read and set it. A new `header` cell style gives header rows a light green look in both themes. In every grid, the focus ring and the cell editor line up with the grid lines on all four sides, and a selected range shows as a faint translucent fill with an outline instead of a solid blue block. In light mode the boot loader's mark keeps its colours at half opacity.
