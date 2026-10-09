---
'@dxos/echo': minor
---

Queries gain `.snapshot()`, which returns frozen `Obj.Snapshot` values built from the index instead of live objects, so results no longer wait for each object's document to load. Snapshot results re-emit when an object changes, objects the tab already holds show their current state, and `useQuery` types them as snapshots. The space Home page's Recent section uses it.
