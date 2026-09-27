---
'@dxos/react-ui-trace': patch
---

`Gantt.Chart` opens scrolled to its newest events, including when its events arrive after it mounts,
rather than at the start of the history.
