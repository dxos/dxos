---
'@dxos/worker-framework': minor
---

`Client.Connection` takes callbacks for handing the worker between tabs: `onTakeoverRequired` replaces the automatic steal from an unresponsive leader, `onLockStolen` stops a tab whose lock was stolen, and `generation` with `onSuperseded` stops a tab when a newer build of the app opens. `takeover: true` steals the lock when the connection opens, and a stopped connection rejects `open()` with `WorkerStoppedError`. `createClientServices` passes them through as `workerTakeover`. The boot loader (`@dxos/app-framework`) gains `window.__bootLoader.paused(...)`, which stops loading and shows one line, one action and optional details in place of the ring.
