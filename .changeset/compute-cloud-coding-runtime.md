---
'@dxos/edge-compute': minor
'@dxos/plugin-sandbox': minor
---

Runtime support for cloud coding:

- `@dxos/edge-compute/host-process-manager`: `HostProcessManager.makeControl` is the full `RemoteProcessManager.Control` over EDGE's `@dxos/compute/Process.ManagerService` host service (adding `list`, `status` and `terminate`, and forwarding the process key on `spawn`), and `HostProcessManager.make` builds the `Process.ManagerService` the Cloudflare plugin host gives every bundle, for processes in the invocation's space on EDGE.
- `SandboxService` can start a job: a command in an EDGE sandbox with its stdin open, whose output streams out and resumes from offsets, and which can be signalled. A later call re-attaches to it by id.
- EDGE functions get `Credential.AccessTokenResolver` on its own, and the resolver can ask EDGE to exchange a managed token's grant again when the provider refused the stored token.
