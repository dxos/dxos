---
'@dxos/types': patch
'@dxos/plugin-markdown': patch
---

Opening a 200-task project no longer blocks the page for over a second: task tree walks
(`Task.orderTree`, `Task.subtree`, the task list's forest) index parent edges once through the new
`Task.childIndex`, and `Obj.getParent` caches the resolved parent rather than resolving it on every
read. `markdown.create`, `sheet.create` and `sandbox.downloadFile` file what they create into the
space's root collection again.
