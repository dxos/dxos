---
'@dxos/edge-compute': minor
'@dxos/plugin-host-cloudflare': minor
---

`HostProcessControl` is the full `RemoteProcessManager.Control` over EDGE's `@dxos/compute/Process.ManagerService` host service (adding `list`, `status` and `terminate`, and forwarding the process key on `spawn`). `HostProcessControl.makeProcessManager` builds the `Process.ManagerService` the Cloudflare plugin host gives every bundle, for processes in the invocation's space on EDGE.
