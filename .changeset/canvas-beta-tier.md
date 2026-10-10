---
'@dxos/plugin-canvas': patch
'@dxos/react-ui-canvas': minor
'@dxos/plugin-space': patch
'@dxos/react-ui': patch
'@dxos/plugin-registry': patch
---

In `@dxos/react-ui-canvas`, the view has a fit mode: Fit frames the scene and keeps it framed, refitting once a resize settles and on opening another scene, until the viewer pans or zooms. `SceneView.Root` takes `initialDisplay` / `onDisplayChange` (`SceneDisplay`: snap, guides, fit) so a host can restore and persist those toggles, and a view opens in fit mode unless restored otherwise. A read-only view floats its panels. A link caption on a horizontal run is shortened with an ellipsis to fit between the run's ends, its full text as a tooltip. The camera readout shows only the zoom.

In `@dxos/plugin-canvas`, the plugin moves to the `beta` tier. A canvas's view is the viewer's own, kept in one view-state object per canvas: read-only, floating panels, grid, guides, fit and camera; the `dockPanels` setting is gone. The drawing menu now lists Read only and Dock/Float panels. A drawing's canvas record may set `readonly` as the default for viewers who have not chosen. A canvas in the section role (a document's embed) is read-only, shows the drawing without its palette or panels, and takes a 3:2 height. The DXOS Architecture space template seeds its drawings, read-only by default, from diagrams laid out ahead of time (`compiled.json`, kept current by a test), plus Composer, DXOS and EDGE documents that link and embed them.

In `@dxos/plugin-space`, the create-space dialog closes as soon as it is submitted (a failed create is a toast) and its template list aligns with its fields; the collection article is a panel with a Filter… toolbar over a scrolling column of objects, their icons in the hue's text colour; the delete-space dialog's actions sit in `Dialog.Footer`.

In `@dxos/react-ui`, a field in a toolbar no longer overflows it, and a dialog's action bar has the dialog gutter above as well as below.

In `@dxos/plugin-registry`, the load-plugin dialog's action sits in `Dialog.Footer`.
