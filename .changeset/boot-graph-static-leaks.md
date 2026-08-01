---
'@dxos/client': minor
---

Move `runDedicatedWorker` from the `@dxos/client` root export to `@dxos/client/worker` so the worker-side service runtime (client-services, sqlite, hypercore) is no longer statically reachable from main-thread bundles; the in-process host (`fromHost`) and the RTC ice provider are now loaded on demand. Breaking: worker entrypoints importing `runDedicatedWorker` from the root must import it from `@dxos/client/worker`. Also adds an engine-free `@dxos/compute-hyperformula/types` subpath so schema/operation definitions can use cell-address helpers without loading HyperFormula.
