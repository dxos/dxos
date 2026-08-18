---
'@dxos/react-ui-components': minor
---

The `Minimap` rail is renamed `Outline` — it draws an index-space outline of a document, and the
name `Minimap` now belongs to the feed's content-space rail. Along the way: ticks thin evenly to
any rail height (first and last kept, each rendered tick standing for the span to the next, so
`visibleRange` still lights the tick the reader is under); the hover card anchors to the tick's
centre and tracks it; keyboard navigation steps through the host's `onNavigate` when supplied; and
the card's state is published as `data-pointer` / `data-navigated` / `data-shown`.
