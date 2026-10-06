---
'@dxos/echo': patch
---

- **Inbox conversation:** each message tile is a grid card, so the sender's avatar and the detail rows' icons (recipients, attachments, tags) share one start rail and every text starts at the same edge; the disclosure caret sits after the sender's name and the open/close animates.
- **Card.Section:** merges a `className` from an `asChild` parent, so `Collapsible.Content asChild` keeps its height animation; a collapsible on a section keeps the section's subgrid.
- **Card.Row:** `align='start'` centres the leading icon and trailing cell on the row's first line, for a title over a snippet.
