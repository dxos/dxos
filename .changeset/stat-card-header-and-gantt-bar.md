---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

A stats card's header puts its menu in the trailing rail, with the status (e.g. "healthy") at the end of the title column rather than straight after the title. The project timeline's horizontal scrollbar spans only the chart, not the sticky lane names, via a new `trackStart` on `ScrollArea.Root` that keeps the start of the horizontal track clear.
