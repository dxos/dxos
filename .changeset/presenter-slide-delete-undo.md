---
'@dxos/ui-editor': patch
'@dxos/plugin-space': patch
---

Deleting an object now also removes it from the list its parent declares with `ContainerAnnotation` (a presentation's slides), and undo puts it back in place; undo in an automerge-bound editor no longer reverts the document's initial load and blanks the text.
