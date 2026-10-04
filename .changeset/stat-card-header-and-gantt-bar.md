---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Card layout cleanups. Every stats card header has one layout: the icon in the start rail, the title and optional info as a two-column grid, and the button or menu centred in an end rail that is kept even when empty, so the info ends at the same edge on every card. An icon-only button inside a `Block` no longer adds its own inset, which had pushed it off-centre in the cell. `Card.Row` takes `span` — `full` across both rails, `end` on through the end rail — in place of hand-written grid-column overrides, and a markdown card's word count now spans the rails as its snippet does, so the two start at the same edge. The project timeline's horizontal scrollbar spans only the chart, not the sticky lane names, via a new `trackStart` on `ScrollArea.Root`. The debug port's session id is a disabled copyable input, as the Space ID is.
