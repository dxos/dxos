---
'@dxos/compute': minor
---

Add `Process.Manager` (`Process.ManagerService`), one process-control surface that spawns, lists and attaches to processes locally or on EDGE by `location`, implemented by `LocatedProcessManager` in `@dxos/compute-runtime`. Breaking: `ProcessManager.Handle`, `Status`, `SpawnOptions` and `ListOptions` moved to `Process` in `@dxos/compute`, and `AgentLocation` is replaced by `Process.Location`. `RemoteProcessHandle` now retries a failed event read with backoff instead of ending the subscription, so one dropped request no longer stops a remote process's outputs from reaching its subscribers. `@dxos/react-ui-form` number fields take their stepper increment from a new `StepAnnotation`, defaulting to 1 for integers and otherwise 0.1 or 0.01 by the size of the value.
