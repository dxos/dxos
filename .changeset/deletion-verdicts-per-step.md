---
'@dxos/echo-host': patch
---

Queries load each object's parent and relation endpoints once per evaluation instead of once per result: the host shares loaded dependencies between its deleted-object and unresolvable-dependency filters for the run. A query over 200 tasks under one project made 400 index lookups for that project on every re-evaluation.
