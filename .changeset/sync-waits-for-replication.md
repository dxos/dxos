---
'@dxos/keys': patch
'@dxos/edge-client': patch
'@dxos/edge-compute': patch
'@dxos/plugin-connector': patch
---

A connection sync that starts on EDGE before the client's new connection or binding has replicated there now waits for it, instead of finishing with nothing synced until the next scheduled run. `Binding.loadReplicated` loads such an object with a short retry in the run, then runs the operation again; it gives up once the object is several minutes old. A force-run of a remote trigger now carries the fire event's `data` to EDGE, so the pressed binding is synced first there too.
