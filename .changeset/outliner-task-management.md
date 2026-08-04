---
'@dxos/plugin-outliner': minor
'@dxos/ui-editor': minor
---

Convert outline items into Task objects: a "Convert to task" action replaces the item with a link to a new Task parented to a project created lazily on first use, and the link navigates to the task in place. Adds the `getItemText`, `replaceItemWithLink`, and `syncLinkLabels` editor commands. Fixes the outliner content column not being centered, which pushed the drag grip outside the document and the line menu inside it.
