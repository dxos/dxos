---
'@dxos/echo': minor
---

`@dxos/echo` gains `Format.Markdown`, the string format a form already rendered in a Markdown editor and that until now only had an enum value, and a markdown field renders its headings at the body size, so every line of a form row is the same height whatever the markup says.

A grid cell marks the keyboard cursor whether or not it unfurls, so a read-only table shows where the cursor is, and a table's cursor takes the app's selection colour rather than the grid's blue ring (the sheet keeps the blue, where a selected range and a focused cell have to read apart). A table's cells sit on the host's surface, so only the grid lines separate it from the panel around it, and a list of values prints as one line that wraps downward over the rows beneath when the cell takes the cursor — `focusUnfurl: 'block'`, new in `@dxos/lit-grid`, which also exports `isSameCell` from its root.

A tile in a collection reads as a list's rows do: the selection is the focus colour, the cursor is neutral, and an item that is both shows both — the selected edge inside the box, the cursor outlined outside it. Before, clicking a tile replaced the edge that said what was selected.

A graph node the host marks `data-selected` keeps its hue and takes the focus ring as its edge, so an app can show which node its detail pane is about without the `dx-selected` class repainting the node red, and the standalone stylesheet carries the `data-color` hues so a consumer without the theme can colour nodes at all.

`DynamicTable` rebuilds its table from the properties' contents rather than their identity — a caller that built the array inline rebuilt the table, and with it every cell, on each of its own renders — and keeps absent properties distinct from an empty list, which select different schemas.
