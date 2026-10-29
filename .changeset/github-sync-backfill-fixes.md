---
'@dxos/plugin-github': patch
---

GitHub sync no longer repeats the same backfill chunk forever when more than ten pages of issues were updated within a few seconds, and a locally edited repository description is pushed even when GitHub reports no other changes.
