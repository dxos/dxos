---
'@dxos/app-framework': patch
'@dxos/plugin-client': patch
---

Resolve the remote trace monitor through a live capability view instead of a startup snapshot, so the aggregate `ProcessMonitor` picks the swarm-backed monitor up whenever it is contributed — even after its consumers have already subscribed. The client's `RemoteTraceMonitor` module no longer activates at startup as a result.
