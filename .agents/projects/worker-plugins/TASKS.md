# worker-plugins — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Branch `dm/zen-hawking-92843m`.

## Phase 1 — base worker

- [x] `runtime.client.worker_plugins` proto field.
- [x] `@dxos/app-framework/worker`: `PluginWorker.run`, `WorkerEvents`, `WorkerCapabilities`.
- [x] Browser test: toy plugin by URL contributes a LayerSpec + RPC group; tab calls it.

## Phase 2 — client services as a plugin

- [x] `clientServiceSpecs({ externalRouter })`; worker helpers (`WorkerRuntime.openStack`, `SqliteSpec`,
      `workerStackOptions`, `probeOpfs`) shared with `makeWorkerRuntime`.
- [x] `@dxos/plugin-client/worker` plugin module.

## Phase 3 — Composer

- [x] Observability worker plugin.
- [x] Worker entry → `PluginWorker.run`; tab config lists plugin URLs (`?module-url`).
- [x] Dev boot verified with Playwright: identity created, survives reload, second tab boots.
- [ ] CI: production build + Composer e2e.

## Follow-ups

- [ ] `@dxos/compute-runtime/LayerStack` subpath so the worker base stops importing the root barrel.
- [ ] Move the tasks/todomvc apps (and `@dxos/client/worker`'s `runDedicatedWorker`) onto `PluginWorker`,
      then delete `makeWorkerRuntime`.
