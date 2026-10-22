---
'@dxos/echo': patch
---

Fix a document staying out of sync with EDGE forever when its resync was requested while a sync round for it was already running; the request now runs once that round settles.
