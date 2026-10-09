---
'@dxos/plugin-github': minor
---

Spaces holding pull requests now get one hourly EDGE trigger that refreshes their open and draft pull requests from GitHub in bounded batches, so their state no longer goes stale until someone opens them.
