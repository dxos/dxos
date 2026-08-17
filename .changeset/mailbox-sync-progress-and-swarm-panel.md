---
'@dxos/plugin-client': patch
'@dxos/devtools': minor
---

Fix remote (EDGE) sync progress never reaching progress meters — the swarm trace monitor and the progress registry now activate at startup, so the process monitor's remote trace source and the registry exist before anything subscribes — and add a Swarm announcements panel to devtools stats for inspecting the raw swarm trace broadcasts that progress rides on.
