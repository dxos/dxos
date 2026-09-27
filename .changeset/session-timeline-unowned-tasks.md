---
'@dxos/react-ui-trace': patch
'@dxos/react-ui-task': patch
'@dxos/react-ui': patch
---

The session timeline draws a task that no session's checklist holds as a lane of its own, spanned by its edit history, so tasks worked by an external harness (e.g. Claude Code) or by hand appear on the project pipeline chart. Task lanes (bar, nodes, thread and legend dot) and the task mnemonic chip share a hue hashed from the mnemonic, and the chip leads with the Task type's icon instead of a trailing clipboard glyph; `SystemIconButton.Clipboard` takes an optional `icon` for that idle glyph.
