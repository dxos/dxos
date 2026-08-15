---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add `tags` to operation metadata and filter the trace panel by them. Operation definitions carry a coarse classification (`Operation.Tag`), the tags are recorded on operation trace events, and the trace panel now shows a filter that hides interface, editing, and query chatter by default. `Combobox` gains a `multiple` variant whose items toggle their own membership, and `Picker` now separates the keyboard cursor (`data-highlighted`, addressed by the input's `aria-activedescendant`) from the chosen options (`aria-selected`).
