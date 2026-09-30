---
'@dxos/plugin-space': minor
---

`CreateObjectCustomPanelProps` gains an optional `onCancel`, which the create dialog passes to a plugin's
`customPanel`. The custom create panels (project, channel, game, drawing, routine, connection) now end
with Cancel and Save, and their pickers select an option instead of creating it on click.
