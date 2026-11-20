---
'@dxos/edge-compute': minor
---

`HostProcessControl` is the full `RemoteProcessManager.Control` over EDGE's `@dxos/compute/Process.ManagerService` host service (adding `list`, `status` and `terminate`, and forwarding the process key on `spawn`), and `HostProcessControl.makeManager` builds the `RemoteProcessManager.Manager` a plugin host gives every bundle.
