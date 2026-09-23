---
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
'@dxos/app-toolkit': patch
---

A task row in a project's ledger opens the task as its own plank, the way a mailbox row opens its message: `Project` declares a `project → task` deck chain, plugin-projects contributes hidden `Task` nodes so a task is addressable, and plugin-tasks adds `TaskArticle` (a form over the editable fields, writing through `UpdateTask`). `TaskList.Edit` gains `createOnly` for a host whose detail lives elsewhere, and `onTaskSelect` reports `meta` so a modified click can open a plank of its own. `TypeSection.createTypeSectionExtension` takes a `deck` option for types defined below `@dxos/app-toolkit`.
