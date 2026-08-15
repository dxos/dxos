---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add `tags` to operation metadata and filter the trace panel by them. Operation definitions carry a coarse classification drawn from `@dxos/app-toolkit/OperationTag` (layout, navigation, assistant, connector, database, identity, system), the tags are recorded on operation trace events, and the trace panel now shows a filter that starts on assistant and connector activity. The filter offers only the tags the trace actually contains, and a switch in its popover chooses whether the selection applies to every operation or only to top-level ones (the default), letting whatever a shown operation kicked off come with it. The panel's process tree is hidden behind a toolbar toggle. `Combobox` gains a `multiple` variant whose items toggle their own membership, and `Picker` now separates the keyboard cursor (`data-highlighted`, addressed by the input's `aria-activedescendant`) from the chosen options (`aria-selected`).
