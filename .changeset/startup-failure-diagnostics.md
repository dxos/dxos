---
'@dxos/app-framework': minor
---

Report where startup and the worker connection failed instead of only that they timed out. Failures now raise typed errors (`StartupTimeoutError`, `WorkerError`, `WorkerConnectionError`) carrying their diagnostics in `BaseError.context`, so error tracking names the failure instead of showing a bare `Error`, and `Effect.catchTag` can discriminate on it. `useApp` reports the modules still in flight and dispatches `STARTUP_FAILED_EVENT` on both the deadline and a module activation error; `Connection` reports the leader and connect phase it reached, whether it held the lock, and its retry counters. `withContext` and `errorContextPrimitives` in `@dxos/errors` replace the ad-hoc probes that read that field.
