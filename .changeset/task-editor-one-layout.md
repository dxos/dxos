---
'@dxos/react-ui-task': minor
'@dxos/plugin-assistant': patch
---

The task create/edit pane has one layout instead of two. Every property control sits on the list column it edits, so it lines up with that value in the rows above, and `showDescription` decides whether the pane is one line or two — the `inline` prop is gone, since that is what it used to select. A property the list gives no column keeps its control in a trailing group. Controls on a column track are icon-only, named by their tooltip, and the status control now reads its translated label where the tag it replaces showed the raw enum value.
