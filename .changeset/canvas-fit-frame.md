---
'@dxos/plugin-canvas': minor
'@dxos/plugin-presenter': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
---

A canvas can open framed on a box of the drawing rather than on its own contents. `CanvasSettings` takes `fitFrame`
and `fitZoom`, which `CanvasEditor.Root` threads through to the 2D host, so drawings that each fill a page differently
open at ONE scale and read as one deck instead of nine drawings.

On that frame, `@dxos/plugin-canvas` gains the studio deck's nine slides as canvas drawings: a slide is declared as
what it IS — groups of columns of cards, and the edges between them — and laid out from that declaration, rather than
recovered from the coordinates the deck happened to place. Six element kinds draw them (`card`, `feed-card`, `chip`,
`plank`, `app-frame`, `substrate`), and two stories show the result: the nine side by side, and the deck presented one
slide at a time.

Three defects in the deck importer are fixed along with it. A layout run's extent and pitch are now chosen together,
so the last member of a run ends inside the run's own box rather than up to 16 units past it; a run's members are the
slide's cards and components, so a run overlapping a frame title or a text label is laid out instead of skipped; and a
slide whose deck drew no links can still add the first link of its own. A card's `tone` and `iconTone` are the named
tones that resolve to a token, and a sidecar's `iconTone` now reaches the card it was written for.

`@dxos/plugin-presenter` exports `createPresenterStoryPlugin` from a `./testing` subpath, which stands in for
plugin-deck's ephemeral state when a presentation is shown outside the deck.
