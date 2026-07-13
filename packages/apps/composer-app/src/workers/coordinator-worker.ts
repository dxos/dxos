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
// Routing state must also be shared across every tab port — a fresh handler per connect
// isolates broadcast/delivery so followers never see leader heartbeats or request-port.
let onConnectHandler: ((ev: MessageEvent) => void) | undefined;

onconnect = async (ev) => {
  const Coordinator = await import('@dxos/worker-framework/coordinator');

  if (!logStoreInstalled) {
    logStoreInstalled = true;
    const { log } = await import('@dxos/log');
    const { IdbLogStore } = await import('@dxos/log-store-idb');
    const { LOG_STORE_DB_NAME } = await import('../util');
    const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });
    log.addProcessor(logStore.processor);
  }

  onConnectHandler ??= Coordinator.createOnConnect();
  return onConnectHandler(ev);
};

// const initializeObservability = async () => {s
//   const { log } = await impsort('@dxos/log');
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
