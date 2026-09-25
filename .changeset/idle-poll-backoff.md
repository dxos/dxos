---
'@dxos/echo': patch
---

Reduce idle-tab churn: `TriggerDispatcher` watches its trigger list reactively instead of re-querying the database on every 1 Hz tick, and feed/sync-state polling now backs off (up to 30 s / 15 s) while nothing changes, resetting to the fast interval as soon as it does.
