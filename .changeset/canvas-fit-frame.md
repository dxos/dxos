---
'@dxos/plugin-canvas': minor
'@dxos/react-ui-canvas-editor': minor
---

A canvas can open framed on a box of the drawing rather than on its own contents: `Canvas` takes `fitFrame` and `fitZoom`, which `CanvasEditor.Root` threads through to the 2D host, so several drawings can be shown side by side at one scale. `@dxos/plugin-presenter` exports `createPresenterStoryPlugin`, which stands in for plugin-deck's ephemeral state when a presentation is shown outside the deck.
