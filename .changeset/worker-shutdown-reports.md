---
'@dxos/worker-framework': minor
---

A dedicated worker now tells its leader tab why it is shutting down (displaced by another worker, lost a lock, failed to start, or asked to by the runtime) before it closes, so the reason survives in the tab's logs and in the connection's error diagnostics. The `stop` displacement message names the worker that sent it. Breaking: `WorkerRuntime.makeWorkerRuntime`'s `requestShutdown` option is now a function of the shutdown reason (`(reason) => Effect`) instead of an `Effect`.
