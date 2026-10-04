---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Task lists, trees and the chat prompt are reworked on the react-ui components.

- Task list rows and the task editor place their cells by column name on one shared template, so the editor's fields, pickers and cancel sit in the rows' columns. The editor creates with an estimate and a priority, saves from an end adornment on its title field, and always takes the list's grid. `TaskList.Root` adds `flush`, `showAssignees` and `showMnemonics`; the leading column holds one reference button that shows the ordinal and copies the task's URI. `TaskProperties` and `TaskHistory` are top-level components, and the task's reference heads `TaskProperties`.
- **Breaking:** `TaskEditor` and `TaskOrdinal` are removed (the task article renders a form over the `Task` schema, whose description is Markdown), `TaskMnemonic` is no longer exported, and `TaskList.Editor` drops `grid` and `showControls`.
- `Tree.Content` has no gutter by default and pads row ends (`rowInset`), so row highlights run edge to edge under an overlay thumb. A deferred `ActionMenu` keeps the focus an outside click moved; `ActionToolbar` takes a `start` slot.
- `Form.Root` takes `markdownExtensions`. Popup options sit in an equal inset, an empty `Select` opens no popup, `Select.Trigger` takes `fixed`, a splitter drag no longer dims its panes, and clickable tags keep their hue's text colour.
- Surface modules in plugin-client, plugin-preview and plugin-file declare every role they bind.
