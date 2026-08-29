---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Arrow keys move between listbox rows again when a row carries its own controls (a task row's status toggle no longer swallows the keypress), a textarea's text is inset like an input's rather than sitting against its border, and a toolbar's density now reaches the controls inside it instead of leaving them at the default size. Markdown edited in place wraps, shows a caret against a dark surface, and takes Tab straight into the text. **Breaking:** `TaskList.Create` is now `TaskList.Edit` — it edits the selected task and creates one only when nothing is selected.
