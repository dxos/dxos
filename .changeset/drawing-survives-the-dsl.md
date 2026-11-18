---
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/scene': minor
'@dxos/plugin-canvas': patch
---

A drawing that uses contributed element kinds, or connectors someone routed, survives being written down as text
and read back. Printing the studio deck's Hyperspace slide used to turn every card, plank and substrate into a
plain `rect`, return 51 of the deck's 64 connectors as a default arrow instead of the triangle they were drawn
with, and drop all 14 routes — so rebuilding a drawing from its own DSL replaced it with grey boxes. It now
rebuilds identically: ten cards with their glyphs and tones, three planks with their content, nine packed spaces
and two routed connectors.

Four things carry it. A box names the kind it is and holds that kind's own fields (`kind=card tone=event
variant=simple`), with a field whose name an element attribute already claims escaped as `data-fill=0.55` rather
than dropped — `substrate` keeps a numeric `fill`, which is the density its hexagon draws at. A link keeps its
markers and line style, which on a plain canvas live on the link itself and not on the connector that `read` was
looking at. An arrow states its own bends (`arrow link a -> b via 10,20 30,20`), which a connector routed by hand
or by a layout had no spelling for at all. And a kind's fields live in its `data` bag, where `parts.ts` says they
belong and where the text form can reach them.

A box also keeps the style it is drawn with. `read` dropped a node's style entirely, so a borderless, centred
label came back as a bordered box with its text in the corner — which is what a slide's column headings turned
into on every trip through the text. The style vocabulary gains the four fields the canvas had and the DSL could
not say: `border`, `align`, `valign` and `fontSize`.

None of this needed a value grammar for lists or nested objects, and there still isn't one. The card's glyph was
never a nested object — `iconOf` has always accepted a bare name — so the glyph, body and footer moved into the
kind's bag as scalars. A kind whose field really is a list of simple records writes it as one scalar and reads it
back itself: the substrate's packing and its lit objects are `x,y,r` and `x,y,tone` triples, the spelling
`scene-model.ts` already uses for `points="0,0.5 1,0.5"`. The knowledge of the shape stays with the plugin that
owns the kind, which is where it belongs. The packing's parameters (`spaceCount`, `rmin`, `rmax`, `gap`) are on
the node too, so a field that arrives with neither can still pack itself.

Two things the bench got wrong along the way. `Rebuild` means the text IS the drawing, so it now clears the
canvas first: `applyCommands` only touches the objects its commands name, so an object deleted from the text had
nothing to remove it and stayed on screen. Only DSL-managed records are cleared, since a shape drawn by hand is
in no text. And a read-only canvas draws no grid, no dots and no lattice cells — they are an editing affordance,
what a shape snaps to, and nothing snaps when nothing can be placed.

Losslessness is a test rather than an inspection: a corpus pass over all nine slides compares every kind, its own
fields, its glyph, every link's markers and every route point for point, and fails on five to nine slides with
any one of these removed. The studio bench also gains a DSL/JSON toggle, so a drawing's records can be read
beside its text — which is how the next loss will be seen rather than measured.
