---
'@dxos/plugin-connector': patch
---

Sync a connection by force-running each binding's sync Routine trigger, so an on-demand sync takes the same durable path as the scheduled one. Also syncs a connection as soon as its first sync targets are bound, so a new connection populates without pressing "Sync now" (behind the `AUTO_SYNC_ON_CONNECTION_SETUP` flag).
