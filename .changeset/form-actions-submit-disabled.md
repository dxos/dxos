---
'@dxos/react-ui-form': minor
'@dxos/react-ui-task': patch
---

`Form.Actions` takes `submitDisabled`, which disables submit on top of the form's own `canSave` for work the form did not start itself; the connection panel uses it to hold Connect while its first OAuth start is in flight. A task row's description now spans the artifacts column, so it flows under a pull request chip rather than stopping short of it.
