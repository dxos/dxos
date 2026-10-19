---
'@dxos/plugin-projects': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-form': patch
---

Feature maps are editable in Composer: create a feature on the map and name it in place, add an existing one from the toolbar, edit a card's name and description inline, set status or remove a feature from its card menu, draw and delete dependency arrows and remove boxes on the canvas, and add dependencies and link tasks from the feature article. Every edit runs the same operation an agent uses, and a refused edit (a dependency that would close a cycle) shows its message as a toast. The canvas dynamic projection accepts `onLink` and `onDelete` hooks, so a host can apply those edits to its own model instead of the projection's graph. `ObjectPicker` no longer pins its popup to a custom trigger's width, so a picker behind an icon button is readable.
