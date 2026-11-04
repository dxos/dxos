---
'@dxos/lit-grid': minor
'@dxos/react-ui-grid': minor
'@dxos/react-ui-table': minor
'@dxos/plugin-sheet': minor
'@dxos/plugin-space': patch
'@dxos/plugin-table': minor
'@dxos/ui-editor': minor
---

Tables and sheets show other people's selected cells and ranges. Each one is outlined in the person's member hue and tagged with their name, the same name and color their Markdown cursor shows.

`react-ui-grid` adds `GridSelectionModel`, the selection state both tables and sheets now use. It names cells by row and column id through a `GridAddressing`, so a selection stays on its cells when rows are sorted, filtered or inserted. `Grid.Root` takes an `awareness` provider and `Grid.Content` takes `addressing`. `useAwarenessProvider` opens the object's `awareness.<id>` channel, the one Markdown uses. `dx-grid` draws `remoteSelections`, and its `dx-grid-cells-select` event now carries the `range` with its plane.

In `ui-editor`, `createAwarenessProvider` builds that channel for the editor and the grids, and `AwarenessInfo` now carries the member's `hue`.

In the Database section, a type that has a view (such as a table) now shows its caret before it is first expanded. A member who joins a space can now open a table from its type there.
