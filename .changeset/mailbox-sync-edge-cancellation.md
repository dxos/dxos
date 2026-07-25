---
'@dxos/compute': minor
'@dxos/plugin-inbox': minor
---

Mailbox sync progress can now be cancelled from the sync meter: for an edge-executed sync trigger the cancel control stops the current run and its continuation chain, while the trigger's schedule stays enabled and re-syncs on its next tick. `@dxos/compute` now exports the `Cancellation` service the runtimes provide (`Cancellation.Service`) and operations observe (`Cancellation.signal`).

Breaking:

- `@dxos/app-toolkit`: `ProgressTraceSinkOptions.terminateProcess` is renamed to `cancelProcess` and takes a `CancelTarget` (pid, space, runtime, trigger) instead of a pid, so a cancel can be routed to the runtime that owns the run.
- `@dxos/compute-runtime`: `SwarmRemoteTraceMonitorOptions.subscribe` yields `SwarmTraceBroadcast` (`{ payload, tags }`) instead of a bare payload — the envelope tags carry the ref-typed trace meta dropped by the wire codec.
