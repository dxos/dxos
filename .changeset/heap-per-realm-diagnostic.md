---
'@dxos/echo': minor
---

Report JS heap usage per realm: `@dxos/tracing` now exports `readHeap()` and serves a `heap` diagnostic from every realm, and the dedicated worker tags its diagnostics as `worker` so clients can address it. The devtools memory panel shows the tab and the worker separately. Breaking: `readHeap` moved from `@dxos/observability` to `@dxos/tracing` and returns `undefined` where `performance.memory` is unavailable.
