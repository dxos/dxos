---
'@dxos/react-ui-task': patch
---

`TaskList.Edit` saves the task when Cmd+Enter or Ctrl+Enter is pressed in the description editor, the same as the Save button; on an untitled create row the key does nothing. `@dxos/ui-editor` adds `submitOnModEnter`, a highest-precedence keymap that submits a multi-line field on Cmd/Ctrl+Enter.
