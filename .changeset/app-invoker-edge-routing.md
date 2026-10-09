---
'@dxos/app-framework': patch
'@dxos/compute-runtime': patch
'@dxos/plugin-routine': patch
---

An app now has one process manager: the stack's `Process.ManagerService`, which the app's operation invoker, `Capabilities.ProcessManager` and `AgentService` all use. Operations the app invokes with `on: 'edge'` therefore run on EDGE instead of dying with "Remote process requested, but RemoteProcessManager offers no process control", which an agent's watches and Brain store views logged every three seconds. `@dxos/app-framework` now owns the unified-manager spec that `@dxos/plugin-routine` used to contribute, with a no-op remote manager as a fallback, and a `LayerStack` spec now outranks an ambient service of the same tag.
