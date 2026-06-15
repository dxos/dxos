//
// Copyright 2026 DXOS.org
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

onconnect = async (ev) => {
  const { createCoordinatorOnConnect } = await import('@dxos/client/coordinator-worker-onconnect');

  if (!logStoreInstalled) {
    logStoreInstalled = true;
    const { log } = await import('@dxos/log');
    const { IdbLogStore } = await import('@dxos/log-store-idb');
    const { LOG_STORE_DB_NAME } = await import('./constants');
    const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });
    log.addProcessor(logStore.processor);
  }

  const handler = createCoordinatorOnConnect();
  return handler(ev);
};

// const initializeObservability = async () => {s
//   const { log } = await import('@dxos/log');
//   const { isTauri } = await import('@dxos/util');
//   const Config = await import('./config');

//   try {
//     const config = await Config.setupConfig();
//     await Config.initializeObservability(config, isTauri());
//   } catch (err) {
//     log.catch(err);
//   }
// };

// void initializeObservability();
