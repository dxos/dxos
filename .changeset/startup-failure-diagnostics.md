---
'@dxos/app-framework': minor
---

Report where startup and the worker connection failed instead of only that they timed out. `useApp` now attaches `StartupDiagnostics` (events fired, module counts, the module mid-activation) to the timeout error and dispatches `STARTUP_FAILED_EVENT`, `Connection` annotates its failure with the leader and connect phase it reached, and a worker whose script fails to load reports a real `Error` rather than a null one telemetry drops.
