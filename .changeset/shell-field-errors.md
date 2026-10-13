---
'@dxos/react-ui': minor
---

- HALO and join dialog steps (identity input, profile form, reset confirmation) show their validation message again: the field is marked invalid whenever a message is present, which the field's error text requires before it renders.
- `SceneView.Root` takes `onReadonlyChange`; when given, the palette's tools group (below Pan) gets a lock toggle between looking at the scene and editing it. Turning read-only drops a drawing tool back to select.
- The canvas's properties, layers and about panels are now **inspectors**. **Breaking (`@dxos/react-ui-canvas`):** `SceneView.Root`'s `panels` prop is renamed `inspectors`, and `PanelMode` is renamed `InspectorMode`. `SceneView.Root` also takes `onInspectorsChange`; when given, the dock gets a toolbar whose close button floats the inspectors, and each inspector's menu docks or floats them. `Properties`, `LayersPanel` and `About` take `onDockedChange` for that menu item, and `useInspector`/`InspectorDef` let a host add its own inspector. In Composer, the canvas drawing's "Dock panels" / "Float panels" menu item is removed in favour of these controls.
