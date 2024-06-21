//
// Copyright 2022 DXOS.org
//

// NOTE: Shared worker doesn't support top-level imports currently.
// All worker code & imports have been moved behind an async import due to WASM
// + top-level await breaking the connect even somehow.
// See: https://github.com/Menci/vite-plugin-wasm/issues/37

onconnect = async (event) => {
  const { onconnect } = await import('@dxos/client/worker');
  const { initializeAppObservability } = await import('@dxos/observability');
  const { setupConfig } = await import('./config');
  const { appKey } = await import('./constants');
  // Don't block on observability setup.
  void setupConfig().then((config) => initializeAppObservability({ namespace: appKey, config }));
  await onconnect(event);
};
