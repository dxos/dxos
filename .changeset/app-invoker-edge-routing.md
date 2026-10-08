---
'@dxos/app-framework': patch
---

Operations the app invokes with `on: 'edge'` now run on EDGE. The app's operation invoker sends edge-located spawns to the process manager the plugin `LayerStack` provides, the same one `AgentService` uses, instead of a remote manager with no process control. Before, every such call died with "Remote process requested, but RemoteProcessManager offers no process control", which is what an agent's watches and Brain store views logged every three seconds.
