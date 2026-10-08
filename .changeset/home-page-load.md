---
'@dxos/plugin-space': patch
---

The space Home page no longer holds its sections back while documents load: Recent reserves placeholder tiles sized from an index-only count, starter prompts show from the cache at once and skip the recent-objects query within the refresh interval, the assistant prompt renders before its chat model opens, and the recent-objects filter no longer repeats types.
