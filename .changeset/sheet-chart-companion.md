---
'@dxos/plugin-sheet': minor
'@dxos/react-ui-grid': patch
---

Sheets publish their selected range through the shared `Selection` view state, so companions can read and set it; a new `header` cell style gives header rows a light green look in both themes; and every sheet gets a Charts companion that charts its ranges as bar, pie, or xy plots, saved on the sheet in a new optional `charts` field. In every grid, the focus ring and the cell editor now line up with the grid lines on all four sides, and a selected range is shown as a faint translucent fill with an outline instead of a solid blue block.
