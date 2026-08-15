---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add `tags` to operation metadata and filter the trace panel by them. Operation definitions carry a coarse classification drawn from `@dxos/app-toolkit/OperationTag` (layout, navigation, assistant, connector, database, identity, system), the tags are recorded on operation trace events, and the trace panel now shows a filter that hides layout, navigation, and database chatter by default. The panel's process tree is hidden behind a toolbar toggle. `Combobox` gains a `multiple` variant whose items toggle their own membership, and `Picker` now separates the keyboard cursor (`data-highlighted`, addressed by the input's `aria-activedescendant`) from the chosen options (`aria-selected`).
