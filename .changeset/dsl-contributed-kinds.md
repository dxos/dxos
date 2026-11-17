---
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/scene': minor
---

A drawing that uses a contributed element kind can now be written down. `Shape.Box` carries the kind it is and that
kind's own fields, the DSL spells them `kind=card tone=event variant=simple`, and `SceneHandler` maps both ways —
so a card, plank, chip, app frame or substrate survives records → text → records instead of flattening to a plain
box. Before this, printing the Hyperspace slide turned 14 kinds into 15 rects, and `Rebuild` reported "20 drawn,
21 removed" and replaced the drawing with boxes.

A box naming a kind also accepts that kind's own attributes, which no table can list, since the plugin that
defines the kind decides them. Three cases are deliberately left out, each asserted by the handler's conformance
test rather than assumed away: a field holding a list or a nested object, which neither DSL layer can spell; a
field whose name an element attribute already claims (`substrate`'s numeric `fill` against the style attribute);
and a kind's remaining top-level fields, whose placement needs the kind's own schema.

Losslessness is tested as a property: one unit test for a card, and one over all nine studio slides asserting
every kind keeps its exact count through the round trip. Both fail with the mapping removed.
