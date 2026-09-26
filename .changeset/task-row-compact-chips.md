---
'@dxos/react-ui-task': patch
---

Task list rows show the assignee as an icon, naming it on hover, and show only pull requests among a
task's artifacts; `TaskTags` takes an `artifacts` option for that, and `TaskList.Assignee` an
`iconOnly` one. The detail pane still lists every artifact.
