---
'@dxos/react-ui': minor
---

Shell dialog errors, canvas inspectors and editing controls, and conductor circuits that run.

- HALO and join dialog steps (identity input, profile form, reset confirmation) show their validation message again: the field is marked invalid whenever a message is present, which the field's error text requires before it renders.
- **Breaking (`@dxos/react-ui-canvas`):** the canvas's properties, layers and about panels are now _inspectors_. `SceneView.Root`'s `panels` prop is renamed `inspectors` and `PanelMode` is renamed `InspectorMode`. `onInspectorsChange` adds a close button to the dock's toolbar (it floats the inspectors) and a dock / float item to each inspector's menu; `Properties`, `LayersPanel` and `About` take `onDockedChange` for it, and `useInspector` / `InspectorDef` let a host add its own inspector. Composer's "Dock panels" / "Float panels" drawing menu item is removed.
- `SceneView.Root` takes `onReadonlyChange`; given it, the palette's tools group gets a lock toggle below Pan, and going read-only drops a drawing tool back to select.
- The smart line leads the palette's link tools and is the link a port drag creates until another link tool is picked. The bottom camera and action bars use full-size icons, and the centred action bar keeps clear of the camera bar.
- Conductor circuits save and run: a board's layout elements are open records, so ECHO accepts edits (a dropped shape threw `Unknown property`); the circuit resolves every service its graph needs, so a switch lights its beacon; and the AND, OR and NOT gates draw in node coordinates, meeting their ports.
- The space-level operation handler provider is no longer pruned at startup: its layer spec required the `AtomRegistry` capability instead of the layer service, which also dropped every space spec built on it.
