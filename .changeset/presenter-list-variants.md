---
'@dxos/plugin-presenter': minor
---

Slide markdown takes a `<List variant="cards|steps|outline">` tag, which styles the list it wraps rather than adding an element of its own, so the content stays a plain markdown list while the slide theme paints its rows. `steps` numbers each row from a counter inside its box, `cards` fills the row, and `outline` draws an accent border; an unknown variant falls back to the plain list and is reported as a slide issue.
