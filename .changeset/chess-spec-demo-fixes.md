---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Fixes found while recording a two-person spec demo:

- On a graph canvas, a card laid out into a cell that a placed card holds moves along its row to the next free cell, so the two no longer stack. `pinGraph` pins a whole graph where the layout first draws it.
- `Annotation.atom` and `Annotation.atomProperty` snapshot the value at every depth and compare it by content, so a record nested in an annotation and changed in place reaches readers as a new value, and an unchanged one does not fire.
- A resolved comment thread leaves Active comments as soon as it is resolved, on every peer.
- Opening a comment notification opens the commented object with Comments beside it. `LayoutOperation.Open` takes a linked companion (`~comments`) as its `variant` and opens it beside the plank the open lands on, in the same navigation.
- The toolbar's Add comment finds the text it comments on when it runs, so it works in a field added after the object opened.
- A field an embed claims focus for takes the cursor, its text selected, when it mounts after the embed has attention.
- A spec's slash commands leave a bullet's, quote's or heading's marker out of a block's title, and the block replaces the marker.
