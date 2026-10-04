---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Card layout cleanups. A stats card's header puts its menu in the trailing rail, with the status (e.g. "healthy") at the end of the title column. `Card.Row` takes `span` — `full` across both rails, `end` on through the end rail — in place of hand-written grid-column overrides, and a markdown card's word count now spans the rails as its snippet does, so the two start at the same edge. The project timeline's horizontal scrollbar spans only the chart, not the sticky lane names, via a new `trackStart` on `ScrollArea.Root`. The debug port's session id is a disabled copyable input, as the Space ID is.
