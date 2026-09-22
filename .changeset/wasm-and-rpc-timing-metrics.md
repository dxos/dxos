---
'@dxos/echo': minor
---

`installWasmMemoryProbe()` (`@dxos/util`) counts a realm's wasm linear memory — the bytes automerge,
subduction and SQLite hold outside every JS-heap reading — by wrapping instantiation and keeping a
weak set of the memories a module exports or imports. It publishes a reader on `__dxosWasmMemory`,
so a harness attached over CDP can split wasm memory by realm instead of inferring it from process
RSS.

`RpcTiming` (`@dxos/worker-framework`) now records what the CALLER waited, not only what the server
did: the client middleware times each call to settle and `getReadout()` returns the running totals
and samples for queue wait, service time and round trip. It is published on `__dxosRpcTiming` for
the same out-of-realm reader, which makes a worker's event-loop lag measurable from the app's own
traffic.
