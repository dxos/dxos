---
'@dxos/react-ui-canvas': minor
'@dxos/react-ui': patch
'@dxos/react-ui-form': patch
---

`SceneView` docks its properties and layers panels by default: a column beside the canvas (which narrows rather than sitting under them) holding an accordion with one section per panel, any number open, the column scrolling them together. A button in each panel's toolbar floats the panels back over the canvas, as before. The mode is the view's `panels` atom (`PanelMode`: `'docked'` | `'floating'`), so a host can set or persist it; `Properties` and `LayersPanel` take `docked` and `onDockedChange`.

In `@dxos/react-ui`, `Toolbar` adds no gap or inline padding of its own (its items carry their own spacing, and a `ToggleGroup` in a toolbar drops its gap to match), and an `Accordion` item's icon and caret sit in `Block`s rather than custom padding. In `@dxos/react-ui-form`, a `Form.Viewport` without `scroll` pads its block axis as the scrolling one does, so a form in a host that scrolls it still ends a gutter in.
