---
'@dxos/plugin-markdown': patch
'@dxos/ui-editor': patch
---

An inline object embed whose target was deleted now shows an "Object not found" chip inline after its source, which stays editable, instead of an empty box at the label's reserved height; card embeds no longer reserve a section's height. A block embed is atomic to the caret: one arrow press steps over it instead of two invisible stops. Link widgets can report `unresolved`/`intrinsic` to the editor via `setLinkWidgetState`, block widgets can opt into `keepAlive`, and the placeholder no longer inherits a replaced widget's element or reserved height.
