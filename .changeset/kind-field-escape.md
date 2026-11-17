---
'@dxos/diagram': patch
---

A kind's own field whose name an element attribute already claims is escaped rather than dropped. `substrate`
keeps a numeric `fill` and `fill` is also the style attribute, so the reader resolved it against
`none|solid|pattern|tint` and rejected the value; it is now written `data-fill=0.55`. That field is the density
the substrate's hexagon is drawn at, so losing it flattened the drawing to a uniform field of dots.

The prefix escapes itself: a kind field genuinely named `data-fill` is written `data-data-fill` and reads back as
its own name.
