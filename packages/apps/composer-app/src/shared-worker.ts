//
// Copyright 2022 DXOS.org
//

// NOTE: Shared worker doesn't support top-level imports currently.
// All worker code & imports have been moved behind an async import due to WASM
// + top-level await breaking the connect even somehow.
// See: https://github.com/Menci/vite-plugin-wasm/issues/37

onconnect = async (event) => {
  const { Effect } = await import('effect');
  const { onconnect, getWorkerServiceHost } = await import('@dxos/client/worker');
  const { log } = await import('@dxos/log');
  const { ObservabilityProvider } = await import('@dxos/observability');
  const { initializeObservability, setupConfig } = await import('./config');

  // Await observability so TRACE_PROCESSOR.tracingBackend is set before traced code runs.
  // In workers PostHog returns a stub synchronously, so this is fast (~1-5ms for setupConfig).
  const config = await setupConfig();
  const observability = await initializeObservability(config, false);

  void (async () => {
    const host = await getWorkerServiceHost();
    await observability
      .addDataProvider(ObservabilityProvider.Client.identityProvider(host.services))
      .pipe(Effect.runPromise);
  })().catch((err) => log.catch(err));

  await onconnect(event);
};
