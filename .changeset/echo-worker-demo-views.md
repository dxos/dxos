---
'@dxos/react-ui-table': patch
'@dxos/lit-grid': patch
'@dxos/react-ui-graph': patch
---

A grid cell marks the keyboard cursor whether or not it unfurls, so a read-only table shows where the cursor is at all, and a table's cursor takes the app's selection colour rather than the grid's blue ring (the sheet keeps the blue, where a selected range and a focused cell have to read apart). `@dxos/lit-grid` exports `isSameCell`, which `@dxos/react-ui-grid` already imported from the package root. `@dxos/react-ui-graph`'s standalone stylesheet gains the `data-color` node hues, so a consumer without the theme can colour nodes.
