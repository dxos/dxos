//
// Copyright 2022 DXOS.org
//

// NOTE: Shared worker doesn't support top-level imports currently.
// All worker code & imports have been moved behind an async import due to WASM
// + top-level await breaking the connect even somehow.
// See: https://github.com/Menci/vite-plugin-wasm/issues/37

// `export {}` keeps this file in module scope (no static imports otherwise).
export {};

// Module-level singleton: SharedWorker `onconnect` fires per tab connection but the
// IDB log store and its `log` processor must be registered exactly once for the
// lifetime of the worker.
let logStoreInstalled = false;

onconnect = async (event) => {
  const { Effect } = await import('effect');
  const { onconnect, getWorkerServiceHost, getWorkerConfig } = await import('@dxos/client/worker');
  const { log } = await import('@dxos/log');
  const { IdbLogStore } = await import('@dxos/log-store-idb');
  const { ObservabilityProvider } = await import('@dxos/observability');
  const { initializeObservability } = await import('./config');
  const { LOG_STORE_DB_NAME } = await import('./constants');

  if (!logStoreInstalled) {
    logStoreInstalled = true;
    const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });
    log.addProcessor(logStore.processor);
  }

  // Don't block on observability setup; the buffering backend in TRACE_PROCESSOR
  // captures early spans and replays them once the real OTEL backend registers.
  // Worker config comes from the main thread (seeded by the first connecting client) — the worker
  // does not re-read Storage/Envs/Local/Defaults itself. See DX-930.
  void getWorkerConfig()
    .then(async (config) => {
      const observability = await initializeObservability(config, false);
      const host = await getWorkerServiceHost();
      await observability
        .addDataProvider(ObservabilityProvider.Client.identityProvider(host.services))
        .pipe(Effect.runPromise);
    })
    .catch((err) => log.catch(err));

  await onconnect(event);
};
