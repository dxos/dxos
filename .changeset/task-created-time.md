---
'@dxos/react-ui-task': patch
'@dxos/react-ui': patch
'@dxos/plugin-tasks': patch
---

A task's properties show when it was created, from the database's record of the object. `Timestamp`
(and `formatCompact` / `compactInterval`) accept a Unix timestamp in milliseconds as well as an ISO
string or a `Date`. The task set's sort button reads the field alone ("Priority"), without an "Order:" prefix.
