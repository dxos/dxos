---
'@dxos/client': minor
---

Remove the legacy SharedWorker client-services path. The `@dxos/client/worker` and `@dxos/react-client/worker` subpath exports, the `createWorker` client option, and `ServicesMode.SHARED_WORKER` support are gone; use the dedicated-worker mode (`createDedicatedWorker`) instead. The `SHARED_WORKER` proto enum values are retained but deprecated for wire compatibility.
