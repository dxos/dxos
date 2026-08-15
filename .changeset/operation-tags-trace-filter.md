---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add `tags` to operation metadata and filter the trace panel's process list by them. Operation definitions carry a coarse classification drawn from `@dxos/app-toolkit/OperationTag` (layout, navigation, assistant, connector, database, identity, system), the tags are recorded on operation trace events, and the trace panel's toolbar now offers a filter over the processes it lists, starting on assistant and connector activity. Processes are classified by the operation each one runs, so the filter offers only the tags the listed processes carry; a process that is not an operation invocation (an agent, a trigger dispatcher) is never filtered. `Combobox` gains a `multiple` variant whose items toggle their own membership, and `Picker` now separates the keyboard cursor (`data-highlighted`, addressed by the input's `aria-activedescendant`) from the chosen options (`aria-selected`).
