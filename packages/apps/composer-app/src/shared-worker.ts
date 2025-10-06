//
// Copyright 2022 DXOS.org
//

// NOTE: Shared worker doesn't support top-level imports currently.
// All worker code & imports have been moved behind an async import due to WASM
// + top-level await breaking the connect even somehow.
// See: https://github.com/Menci/vite-plugin-wasm/issues/37

onconnect = async (event) => {
  const { onconnect, getWorkerServiceHost } = await import('@dxos/client/worker');
  const { ObservabilityProvider } = await import('@dxos/observability');
  const { initializeObservability, setupConfig } = await import('./config');

  // Don't block on observability setup.
  void setupConfig().then(async (config) => {
    const observability = await initializeObservability(config);
    const host = await getWorkerServiceHost();
    await observability.addDataProvider(ObservabilityProvider.Client.identityProvider(host.services));
  });

  await onconnect(event);
};
