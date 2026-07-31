---
'@dxos/compute-runtime': minor
---

Collapse `@dxos/functions` and `@dxos/functions-runtime` into `@dxos/compute-runtime` (local runtime + `Remote*` interface tags) and a new private `@dxos/edge-compute` (EDGE deploy/scripts + `Edge*` implementations). Assistant-coupled agent runtime and test helpers move to a new private `@dxos/agent-runtime` (avoiding a `compute-runtime`↔`assistant` build cycle).

`@dxos/compute-runtime` now exports the former functions SDK/services/protocol/triggers/executor plus new namespace modules: `RemoteOperationInvoker`, `RemoteProcessManager`, `RemoteTriggerManager` (interface tags with `layerNoop`), and the aggregate `ProcessMonitor.layer` / `TriggerMonitor.layer` that merge local and remote views. `FunctionInvocationService` now routes through `RemoteOperationInvoker` (superseding `RemoteFunctionExecutionService`). Breaking: `ProcessManager.layer` no longer provides `Process.ProcessMonitorService` — provide `ProcessMonitor.layer` (plus a `RemoteProcessManager` layer) instead; imports of `@dxos/functions` / `@dxos/functions-runtime` move to `@dxos/compute-runtime`, `@dxos/edge-compute`, or `@dxos/agent-runtime`.
