---
'@dxos/plugin-presenter': patch
---

A slide DSL tag is editable in the slide editor. Tags that carried no attributes were atomic — the caret stepped over `<Box>` or `<v-clicks>` whole — which left no position at which to type the attribute that gives them their behaviour. Only `::slot::` markers stay atomic; a marker is a position and has nothing inside it to edit.
