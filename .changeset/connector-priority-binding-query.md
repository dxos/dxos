---
'@dxos/echo': patch
'@dxos/plugin-connector': patch
---

A connector sync fired for one binding (a target's sync button) no longer fails on EDGE with "Schema validation failed": it finds that binding by query, as a scheduled sync does. A database write the schema rejects now names the field in its error.
