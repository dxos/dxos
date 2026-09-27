---
'@dxos/react-ui-task': patch
---

Task list rows show the assignee as an icon in a fixed-width column, naming it on hover
(`TaskList.Assignee` takes `iconOnly`). `TaskTags` now shows a task's tags and its pull requests
only, and no longer renders the assignee, in the list row and the detail pane alike.
