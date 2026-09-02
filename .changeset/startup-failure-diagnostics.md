---
'@dxos/app-framework': minor
---

Report where startup and the worker connection failed instead of only that they timed out. `useApp` now attaches `StartupDiagnostics` (failure kind, events fired, module counts, the modules still in flight) to the error as `context` and dispatches `STARTUP_FAILED_EVENT` on both the deadline and a module activation error; `Connection` annotates its failure with the leader and connect phase it reached, whether it held the lock, and its retry counters; and a worker whose script fails to load reports a real `Error` rather than a null one telemetry drops. Because the diagnostics ride on `error.context`, they reach a downloaded log and the reset dialog's copy payload without a bespoke accessor.
