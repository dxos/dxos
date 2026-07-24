---
'@dxos/schema': patch
---

`TagIndex` membership now compares tag ids by their entity id rather than their full (space-absolute) URI, so tags applied to feed objects survive a space export/import — the importer mints a new space id, which previously left every stored tag key unmatchable. Absolute keys already in existing spaces keep resolving (no migration), and a relatively-stored key resolves against an absolute query and vice versa.
