//
// Copyright 2026 DXOS.org
//

// NOTE: Shared worker doesn't support top-level imports currently.
// All worker code & imports have been moved behind an async import due to WASM
// + top-level await breaking the connect even somehow.
// See: https://github.com/Menci/vite-plugin-wasm/issues/37

onconnect = async (ev) => {
  const { createCoordinatorOnConnect } = await import('@dxos/client');

  const handler = createCoordinatorOnConnect();
  return handler(ev);
};

const initializeObservability = async () => {
  const { log } = await import('@dxos/log');
  const { isTauri } = await import('@dxos/util');
  const Config = await import('./config');

  try {
    const config = await Config.setupConfig();
    await Config.initializeObservability(config, isTauri());
  } catch (err) {
    log.catch(err);
  }
};

void initializeObservability();
