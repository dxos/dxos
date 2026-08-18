---
'@dxos/react-ui-components': minor
---

The rail formerly exported as `Minimap` (renamed `Outline` during this branch) moved to
`@dxos/react-ui-feed`, which is where its consumer — the feed's navigation — lives; import it from
there. It carries the improvements made along the way: ticks thin evenly to any rail height (first
and last kept, each rendered tick standing for the span to the next, so `visibleRange` still lights
the tick the reader is under); the hover card is anchored to the tick's centre and tracks it; and
Arrow Up/Down steps the feed once the rail has focus.
