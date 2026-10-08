---
'@dxos/react-ui-canvas': minor
'@dxos/react-ui': patch
'@dxos/react-ui-list': patch
---

Scenes have layers. `Scene.layers` holds ordered `Layer`s (a scene that names none has one, `DEFAULT_LAYER`), and every node and link is on one (`layer`); created, pasted and fixture-built elements name theirs, and adding a layer first pins elements that name none to the layer they are drawn on (`pinLayers`), so a new bottom layer never takes them. `@dxos/plugin-canvas` names the layers of a drawing saved before layers when it loads. Elements paint by layer, then by their own order, and a hidden layer is neither drawn nor hit. `SceneView.Layers` (`LayersPanel`) selects several layers at once, adds (at the end of the list), deletes, merges the selected layers into the top-most of them, shows or hides, reorders and renames them in place; new shapes go on the top-most selected layer, and the properties panel picks an element's layer. New intents `layer` and `removeLayer` carry the edits, so each is one undo step. `CellGrid` (with `createCellGridAtoms`, `toggleCell`, `ToggleMode` and its headers) is no longer exported from `@dxos/react-ui-canvas`: it moved into `@dxos/plugin-sequencer`, its only user.

In `@dxos/react-ui`, `Editable`'s pencil opens the field with one click whatever the activation gesture, the field shows a save button (a green check) while editing, and inside a list row the preview takes the row's hover and its presses, so the list keeps its arrow keys. `Listbox.Root` takes `selectionMode='extended'` (Cmd/Ctrl- or Shift-click adds to the selection), and `Listbox.Content` takes `padBlock` to pad the list above and below by its gutter. In `@dxos/react-ui-list`, `OrderedList.Root` takes `multiple`, so `value` and `onValueChange` carry an array of ids.
