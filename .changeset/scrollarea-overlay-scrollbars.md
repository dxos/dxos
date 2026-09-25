---
'@dxos/react-ui': minor
---

ScrollArea now overlays the scrollbar thumb on the content instead of reserving layout width for a
native scrollbar. Native scrolling is retained, so scroll chaining and nested scrollers are
unchanged. Pass `native` to restore the classic native scrollbar, which consumes layout width.

The `padding` option reserves the strip the overlay thumb occupies, so content clears it.
