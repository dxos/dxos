---
'@dxos/plugin-space': patch
'@dxos/react-ui-masonry': patch
---

The space Home page no longer holds its sections back or shifts while documents load: Recent reserves placeholder tiles sized from an index-only count, Activity waits for its stats instead of showing zeros, starter prompts show from the cache at once and skip the recent-objects query within the refresh interval, the assistant prompt renders before its chat model opens, and the recent-objects filter no longer repeats types. `Masonry` now lays out at its measured size in its first painted frame instead of starting at zero height, and reveals at once when an earlier mount cached every tile's height.
