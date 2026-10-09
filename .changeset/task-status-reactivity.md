---
'@dxos/react-ui-task': patch
---

Task list rows and the task detail pane repaint when a task's status, priority or estimate changes. Under the React Compiler these controls kept showing the old value until the list remounted. `Task.isAgentWorking` also accepts a task snapshot.
