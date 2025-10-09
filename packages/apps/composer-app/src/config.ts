//
// Copyright 2023 DXOS.org
//

import { Effect, pipe } from 'effect';

import { DXOS_VERSION, Remote } from '@dxos/client';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { Observability, ObservabilityExtension, ObservabilityProvider } from '@dxos/observability';

export const setupConfig = async () => {
  const sources = [await Storage(), Envs(), Local(), Defaults()];
  // Not available in the worker.
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
    sources.splice(0, 0, Remote(searchParams.get('target') ?? undefined));
  }

  return new Config(...sources);
};

export const initializeObservability = async (config: Config) =>
  pipe(
    Observability.make(),
    Observability.addExtension(
      ObservabilityExtension.Otel.extensions({
        // TODO(wittjosiah): Make APP_KEY "composer"?
        serviceName: 'composer',
        serviceVersion: DXOS_VERSION,
        config,
      }),
    ),
    Observability.addExtension(ObservabilityExtension.PostHog.extensions({ config })),
    Observability.addDataProvider(ObservabilityProvider.IPData.provider(config)),
    Observability.addDataProvider(ObservabilityProvider.Storage.provider),
    Observability.initialize,
    Effect.runPromise,
  );
