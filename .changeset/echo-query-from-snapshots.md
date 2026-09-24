---
'@dxos/echo': patch
---

The storage worker answers queries over document objects from the index's snapshots when they are current, instead of loading each matching document; snapshots of document objects now keep `@meta`, which the full-text index still skips.
