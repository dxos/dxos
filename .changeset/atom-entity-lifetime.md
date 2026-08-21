---
'@dxos/echo': patch
---

Bound reactive object atoms to the lifetime of the entity they derive from, so they and their cached snapshots are released with the object rather than retained for the lifetime of the page.
