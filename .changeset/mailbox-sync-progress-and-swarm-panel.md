---
'@dxos/plugin-client': patch
'@dxos/devtools': minor
---

Fix remote (EDGE) sync progress never reaching progress meters — the trace-progress bridge now subscribes to the live swarm trace monitor instead of a stale setup-time snapshot, and the progress registry activates at startup — and add a Swarm announcements panel to devtools stats for inspecting the raw swarm trace broadcasts that progress rides on.
