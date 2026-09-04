---
'@dxos/echo': minor
---

Agents and other processes can now run on EDGE: `AgentService.getSession` takes `location: 'edge'` to spawn a conversation that outlives the client, and `RemoteProcessManager` carries the control surface that drives one (spawn by process key, list, status, input, terminate, cursor-based output/trace reads, RPC). `Process.Monitor.list(filter)` reports processes across local and remote runtimes, so a caller can find its own process without holding a handle.
