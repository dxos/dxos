---
'@dxos/plugin-review': patch
'@dxos/ui-editor': patch
---

Only a deliberate click on a comment thread reveals and highlights its anchor in the document. A thread taking focus (a new draft autofocusing, a re-render restoring focus) no longer moves the editor caret, which previously discarded a live text selection and retargeted the next comment onto the wrong word. Clicking a thread now always syncs the editor highlight, instead of skipping it when the app already considered that thread current.
