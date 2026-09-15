---
'@dxos/client-services': patch
---

Fix spaces imported from a binary space archive returning no results for type queries: imported documents now take the new space's id instead of keeping the exporting space's.
