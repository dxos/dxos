---
'@dxos/react-ui': patch
---

`SystemIconButton.Clipboard` now runs an `onClick` passed to it before copying, where it used to drop it. Clicking a task's short ID in the task list copies its URI without also selecting the row.
