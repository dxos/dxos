---
'@dxos/types': patch
'@dxos/plugin-markdown': patch
---

Task tree walks (`Task.orderTree`, `Task.subtree`, the task list's forest) index parent edges once
instead of re-reading every task per node, so opening a 200-task project no longer blocks the page
for over a second; `Task.childIndex` exposes the index. `markdown.create`, `sheet.create` and
`sandbox.downloadFile` file what they create into the space's root collection again.
