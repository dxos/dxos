---
'@dxos/react-ui-canvas': minor
---

Scenes have layers: `Scene.layers` holds ordered `Layer`s (a scene that names none has one, `DEFAULT_LAYER`), and every node and link is on one (`layer`). Elements paint by layer, then by their own order, and a hidden layer is neither drawn nor hit. `SceneView.Layers` (`LayersPanel`) adds, deletes, merges down, shows or hides, reorders and renames layers in place; new shapes go on the active layer, and the properties panel picks an element's layer. New intents `layer` and `removeLayer` carry the edits, so each is one undo step.
