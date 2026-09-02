---
'@dxos/plugin-client': patch
'@dxos/devtools': minor
---

Fix remote (EDGE) sync progress never reaching progress meters — the progress registry now activates at startup, so it exists before anything subscribes — and add a Swarm announcements panel to devtools stats for inspecting the raw swarm trace broadcasts that progress rides on.
