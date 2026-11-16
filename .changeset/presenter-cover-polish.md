---
'@dxos/plugin-presenter': minor
---

Two box styles for a title slide's artwork. `<Box variant="spread">` fills the slide and pushes its blocks to the top and bottom edges, which leaves the middle to whatever is behind them. `<Box variant="fill">` gives a picture a column of its own: it grows to the column's height and is cropped to its width, so a mark at the art's centre stays centred however narrow the column is — with `bleed`, the art runs to the slide's own edges.

`<Box variant="watermark">` is removed; the column is the same idea without an oversized mark behind the words.

A centred slide spaces its blocks to be read apart: a mark, a name and a date no longer sit one line from each other.
