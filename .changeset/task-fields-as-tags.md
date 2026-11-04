---
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': patch
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
'@dxos/react-ui-task': minor
---

The task list's create row is one line on the list's own columns: each field sits as a `Tag` in the track where the rows show it, so the chat prompt's add row lines up with its tasks again. `TaskList.Root` takes the title line's cells as an ordered `columns` list (default `DEFAULT_COLUMNS`), which the rows and the create row share; the chat puts status ahead of the title and priority and estimate after it. A row's estimate is a control in a track of its own. The project overview's status also renders as a `Tag`.

Breaking: `TaskList.Root`'s `showAssignees` is removed (leave `assignee` out of `columns`), `Button`'s `pill` is removed, `Select.Trigger`'s `pill` becomes `tag`, which renders the trigger as a `Tag`, and the `pill` form presentation becomes `tag`.
