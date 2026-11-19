---
'@dxos/plugin-canvas': minor
'@dxos/plugin-presenter': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
---

A canvas can open framed on a box of the drawing rather than on its own contents. `CanvasSettings` takes `fitFrame`
and `fitZoom`, which `CanvasEditor.Root` threads through to the 2D host, so drawings that each fill a page differently
open at ONE scale and read as one deck instead of nine drawings.

`@dxos/plugin-presenter` exports `createPresenterStoryPlugin` from a `./testing` subpath, which stands in for
plugin-deck's ephemeral state when a presentation is shown outside the deck.
