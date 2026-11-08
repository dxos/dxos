---
'@dxos/react-ui-table': patch
'@dxos/lit-grid': patch
'@dxos/react-ui-graph': patch
'@dxos/react-ui': patch
'@dxos/echo': patch
---

A grid cell marks the keyboard cursor whether or not it unfurls, so a read-only table shows where the cursor is at all, and a table's cursor takes the app's selection colour rather than the grid's blue ring (the sheet keeps the blue, where a selected range and a focused cell have to read apart). A table's cells also sit on the host's surface, so only the grid lines separate the table from the panel around it. `@dxos/lit-grid` exports `isSameCell`, which `@dxos/react-ui-grid` already imported from the package root. `@dxos/react-ui-graph`'s standalone stylesheet gains the `data-color` node hues, so a consumer without the theme can colour nodes. A list of values prints as one line and, when the cell takes the cursor, wraps downward over the rows beneath (`focusUnfurl: 'block'`, new in `@dxos/lit-grid`) rather than growing sideways on one line.

In `@dxos/react-ui`, a tile in a collection now reads as a list's rows do: the selection is the focus colour and the cursor is neutral, and an item that is both shows both — the selected edge inside the box, the cursor outlined outside it. Before, clicking a tile replaced the edge that said what was selected.

`DynamicTable` rebuilds its table from the properties' contents rather than their identity: a caller that builds the array inline rebuilt the table, and with it every cell, on each of its own renders — a flicker whenever anything outside the table changed.

`@dxos/react-ui-graph` also paints a node the host marks `data-selected`: it keeps its hue — the type is still what it is — and takes the focus ring as its edge, so an app can show which node its detail pane is about without the existing `dx-selected` class repainting the node red.

`@dxos/echo` gains `Format.Markdown`, the string format a form already renders in a Markdown editor and that only had an enum value until now.
