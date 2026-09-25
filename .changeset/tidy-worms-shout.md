---
'@dxos/worker-framework': patch
---

Fix a client startup hang where a newly elected leader's worker waited out the full 15s budget on
the storage lock. The stop signal that stands the previous worker down was broadcast from inside the
storage-lock callback, so it was never sent while the new worker queued behind the incumbent it was
meant to displace. It now goes out before the lock is requested. Also fixes a connection that could
never close while its connect task was waiting for a port.
