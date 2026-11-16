---
'@dxos/lit-grid': minor
'@dxos/react-ui-grid': minor
'@dxos/react-ui-table': minor
'@dxos/plugin-sheet': minor
'@dxos/plugin-space': patch
'@dxos/plugin-table': minor
---

Tables and sheets show other people's selected cells and ranges. Each one is outlined in the person's member hue and tagged with their name, the same name and color their Markdown cursor shows. A selection stays on its rows when anyone sorts, filters or inserts rows, and focusing a header or a table's draft row clears yours for everyone else. Selecting a commented sheet cell opens its thread only when you move to it, not when someone else's edit shifts its row.

`react-ui-grid` adds `GridSelectionModel`, the selection state both tables and sheets now use, with cells named by row and column id through a `GridAddressing`. `Grid.Root` takes an `awareness` channel and `Grid.Content` takes `addressing`. `useGridAwareness` creates that channel, a `@dxos/protocols/Awareness` channel on `awareness.selection.<id>` whose value is the selection's corner cells by id, and the grid shows one selection per member. The sheet's cursor and range now come from this model.

`dx-grid` draws `remoteSelections`, and its `dx-grid-cells-select` event carries the `range` with its plane. It adds `getSelection()`, `getFocusedCell()` and `moveSelection(range, { focus })`, and `refocus(axis, delta)` now moves the selection with focus.

In the Database section, a type that has a view (such as a table) now shows its caret before it is first expanded. A member who joins a space can now open a table from its type there.
