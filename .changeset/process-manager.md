---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

`Process.Manager` (`Process.ManagerService`) replaces `Process.Monitor`: it keeps the process-tree reads and trace stream that span local and remote runtimes, and adds `spawn` and `handles` verbs that take a `Process.Location`, so a caller no longer holds the local and remote managers separately. `Process.isTerminal` and `Process.isExited` replace hand-written checks of terminal process states.

Breaking: `Process.Monitor`, `Process.MonitorFilter` and `Process.ProcessMonitorService` are removed (use `Process.Manager`, `Process.Filter`, `Process.ManagerService`); `ProcessManager.Handle`, `Status`, `SpawnOptions` and `ListOptions` move to `Process`; `ProcessMonitor.layer` is now `UnifiedProcessManager.layer`; the local manager exposes `processTreeAtom` and `subscribeToTraceMessages` directly instead of `monitor`; the `Capabilities.ProcessMonitor` capability is now `Capabilities.ProcessManager`; and `AgentService.layer` requires `Process.ManagerService` instead of both process managers.
