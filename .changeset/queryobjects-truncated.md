---
'@dxos/plugin-space': patch
---

`space.queryObjects` now returns `truncated` alongside `results`, so a page capped by `limit` (default 10) can be told from the whole set rather than being read as complete.
