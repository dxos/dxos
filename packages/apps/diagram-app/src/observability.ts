//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { type Client, DXOS_VERSION } from '@dxos/client';
import { type Config, getEnvString } from '@dxos/config';
import * as Observability from '@dxos/observability/Observability';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import * as ObservabilityProvider from '@dxos/observability/ObservabilityProvider';

const SERVICE_NAME = 'diagram';

/** PostHog's own UI, for the replay and toolbar links that would otherwise point at the ingestion proxy. */
const POSTHOG_UI_HOST = 'https://eu.posthog.com';

export const initializeObservability = (config: Config, sessionRecordingStart?: Effect.Effect<void>) => {
  const environment = getEnvString(config, 'DX_ENVIRONMENT') ?? 'unknown';
  return Function.pipe(
    Observability.make(),
    Observability.addExtension(
      ObservabilityExtension.Otel.extensions({
        serviceName: SERVICE_NAME,
        serviceVersion: DXOS_VERSION,
        environment,
        config,
        logs: true,
        metrics: true,
        traces: true,
      }),
    ),
    Observability.addExtension(
      ObservabilityExtension.PostHog.extensions({
        config,
        release: config.get('runtime.app.build.version'),
        environment,
        serviceName: SERVICE_NAME,
        posthog: { ui_host: POSTHOG_UI_HOST },
        sessionRecordingStart,
      }),
    ),
    Observability.addDataProvider(ObservabilityProvider.IPData.provider(config)),
    Observability.addDataProvider(ObservabilityProvider.Storage.provider),
    Observability.addDataProvider(ObservabilityProvider.ObjectEvents.provider),
    Observability.addDataProvider(ObservabilityProvider.SpaceEvents.provider),
    Observability.addDataProvider(ObservabilityProvider.EventLoopLag.eventLoopLagProvider()),
    Observability.initialize,
  );
};

export const addClientProviders = (observability: Observability.Observability, client: Client) =>
  Effect.all(
    [
      ObservabilityClientProvider.Client.identityProvider(client.services.services),
      ObservabilityClientProvider.Client.networkMetricsProvider(client.services.services),
      ObservabilityClientProvider.Client.runtimeMetricsProvider(client.services.services),
      ObservabilityClientProvider.Client.spacesMetricsProvider(client),
      ObservabilityClientProvider.Client.documentsMetricsProvider(client),
      ObservabilityClientProvider.Client.syncMetricsProvider(client),
    ].map((provider) => observability.addDataProvider(provider)),
    { discard: true },
  );
