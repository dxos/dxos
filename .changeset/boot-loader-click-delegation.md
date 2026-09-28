---
'@dxos/app-framework': patch
---

The boot loader no longer leaves a document-level click listener behind after it unmounts, which kept the app's first click event, and the view it landed in, from being garbage collected.
