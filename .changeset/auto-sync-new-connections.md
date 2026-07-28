---
'@dxos/plugin-connector': patch
---

Sync a connection as soon as its first sync targets are bound, so a new connection populates without pressing "Sync now" (behind the `AUTO_SYNC_ON_CONNECTION_SETUP` flag).
