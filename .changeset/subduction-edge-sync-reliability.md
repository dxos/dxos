---
'@dxos/echo-host': patch
---

Fix silent stalls in subduction edge replication. Reconnects now run a clean connection restart (no unbounded re-subscribe loop) and replaced connections close immediately so in-flight sync rounds settle and re-drive promptly; the keepalive watchdog no longer false-restarts a healthy connection when the event loop is CPU-pinned by bulk sync. Client-side frame batching plus an in-flight sync gate and reconnect re-drive (automerge-repo patch) let large host→edge→guest replications complete reliably instead of wedging.
