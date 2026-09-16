---
'@dxos/plugin-assistant': patch
'@dxos/react-ui-list': patch
'@dxos/react-ui-components': patch
'@dxos/react-ui': patch
'@dxos/react-ui-assistant': patch
---

TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.
