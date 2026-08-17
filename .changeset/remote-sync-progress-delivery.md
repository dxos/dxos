---
'@dxos/plugin-client': patch
---

Fix remote (EDGE) sync progress never reaching progress meters: the trace-progress bridge now subscribes to the live swarm trace monitor instead of the process-manager aggregate (whose remote half is a setup-time snapshot the monitor's contribution always postdates), declares the monitor as an activation dependency, and no longer aborts activation when the progress registry has not been contributed yet; the progress registry itself now activates at startup, matching its always-on contract.
