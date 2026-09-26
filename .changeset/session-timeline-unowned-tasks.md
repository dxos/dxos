---
'@dxos/react-ui-trace': patch
'@dxos/react-ui-task': patch
---

The session timeline draws a task that no session's checklist holds as a lane of its own, spanned by its edit history, so tasks worked by an external harness (e.g. Claude Code) or by hand appear on the project pipeline chart. Task lanes (bar, nodes, thread and legend dot) and the task mnemonic chip now share a hue hashed from the mnemonic, so a lane reads as the same task as its chip.
