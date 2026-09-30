---
'@dxos/compute-runtime': patch
---

`LayerStack` attempts every teardown before re-emitting the first failure.

Both destroy loops take their resources off the tracking array and then dispose them one at a time, so a failure part-way through left the rest disposed by nobody: the array no longer held them, and a second `destroy` had nothing to retry. Each teardown now runs under `Effect.exit`, and the first failure is re-emitted once all of them have been attempted.
