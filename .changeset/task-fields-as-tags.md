---
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': patch
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
'@dxos/react-ui-task': minor
---

The chat prompt's task list adds a task in one line again: `TaskList.Editor`'s `inline` lays the create row on the list's own columns, each field the rows' own glyph under the column it edits. `TaskList.Root` takes the title line's cells as an ordered `columns` list (default `DEFAULT_COLUMNS`), which the rows and an inline create row share; the chat puts status ahead of the title and priority and estimate after it. The project list's create row keeps its stacked layout. Form fields with the `tag` presentation, and the project overview's status, render as react-ui's `Tag` in its new `outline` variant, which draws the hue as a ring and text on no fill.

Breaking: `TaskList.Root`'s `showAssignees` is removed (leave `assignee` out of `columns`), `Button`'s `pill` is removed, `Select.Trigger`'s `pill` becomes `tag`, which renders the trigger as a `Tag`, and the `pill` form presentation becomes `tag`.
