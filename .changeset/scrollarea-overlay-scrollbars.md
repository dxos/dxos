---
'@dxos/react-ui': minor
---

ScrollArea now overlays the scrollbar thumb on the content instead of reserving layout width for a
native scrollbar. Native scrolling is retained, so scroll chaining and nested scrollers are
unchanged. Pass `overlay={false}` to restore the classic native scrollbar.
