---
'@dxos/react-ui-form': patch
---

`Form.Content` now submits on Ctrl+Enter as well as Cmd+Enter, including from a markdown field, and
only when the form is valid, so the create-task dialog creates a task from the keyboard and does
nothing while the title is blank. The dialog's description is now a multi-line markdown field.
