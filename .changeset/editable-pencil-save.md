---
'@dxos/react-ui': patch
---

`Editable`: the preview's pencil opens the field with one click whatever the activation gesture, the field shows a save button (a green check) at its end while editing, and inside a list row the preview takes the row's hover. A list row treats a press on an `Editable` preview as a press on the row, so the row is selected and the list keeps its arrow keys.
