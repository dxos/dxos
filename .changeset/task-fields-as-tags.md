---
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
'@dxos/react-ui-task': patch
---

The task editor's status, priority, assignee and estimate fields render as `Tag`s, the same as a task row's tags. Breaking: `Button`'s `pill` is removed, `Select.Trigger`'s `pill` becomes `tag`, which renders the trigger as a `Tag`, and the `pill` form presentation becomes `tag`.
