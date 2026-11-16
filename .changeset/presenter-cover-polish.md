---
'@dxos/plugin-presenter': minor
---

`<Box variant="spread">` fills the slide and pushes its blocks to the top and bottom edges, which leaves the middle to whatever is behind them — the art on a title slide.

`<Box variant="watermark">` is raised out of the slide rather than laid on it: the mark is taken to the surface's own value and two drop-shadows, dark down-end and light up-start, are the only thing that reads. It is drawn no taller than the slide and set so that its central bar stands one bar-height in from the start edge, and nudged down by half the air its own square leaves above it, so the mark is centred rather than the square.

A centred slide spaces its blocks to be read apart: a mark, a name and a date no longer sit one line from each other.
