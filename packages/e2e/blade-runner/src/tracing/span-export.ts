//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Config, DXOS_VERSION } from '@dxos/client';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as Observability from '@dxos/observability/Observability';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

/** PostHog's EU ingestion host, which serves OTLP under `/i`; `DX_POSTHOG_API_HOST` overrides it. */
const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

/**
 * Service name the PostHog dashboard "EDGE nightly join latency (spans)" filters on; renaming it
 * empties the dashboard.
 */
export const SPAN_SERVICE_NAME = 'blade-runner';

/** Bounds the export a replicant waits on before exiting, so an unreachable endpoint cannot hold up a run. */
const FLUSH_TIMEOUT = Duration.seconds(10);

let observability: Observability.Observability | undefined;

/**
 * Exports this process's spans to PostHog when the run supplies a project token in `DX_POSTHOG_API_KEY`,
 * so the EDGE nightly's `CollectionSynchronizer.syncPeer` spans reach its span-based dashboard. A run
 * without the token exports nothing.
 */
export const startSpanExport = async (): Promise<void> => {
  const apiKey = process.env.DX_POSTHOG_API_KEY;
  if (!apiKey || observability) {
    return;
  }

  const destination = ObservabilityExtension.PostHog.otelDestination(
    new Config({
      runtime: {
        app: {
          env: {
            DX_POSTHOG_API_HOST: process.env.DX_POSTHOG_API_HOST ?? DEFAULT_POSTHOG_HOST,
            DX_POSTHOG_API_KEY: apiKey,
          },
        },
      },
    }),
  );
  const commitHash = process.env.GITHUB_SHA;
  observability = await EffectEx.runPromise(
    Function.pipe(
      Observability.make(),
      Observability.addExtension(
        ObservabilityExtension.Otel.extensions({
          serviceName: SPAN_SERVICE_NAME,
          serviceVersion: DXOS_VERSION,
          // In node the namespace is the directory the opt-out state is kept in; it defaults to the service
          // name, relative to the working directory.
          namespace: join(tmpdir(), 'dxos-blade-runner-observability'),
          environment: process.env.CI ? 'ci' : 'local',
          config: new Config(commitHash ? { runtime: { app: { build: { commitHash } } } } : {}),
          additionalDestinations: destination ? [destination] : [],
          traces: true,
        }),
      ),
      Observability.initialize,
    ),
  );
  const runId = process.env.GITHUB_RUN_ID;
  if (runId) {
    observability.setTags({ ciRunId: runId });
  }
  log.info('exporting spans to PostHog', { service: SPAN_SERVICE_NAME });
};

/** Tags every span started from now on; used to name the EDGE a replicant runs against. */
export const setSpanTags = (tags: Record<string, string>): void => {
  observability?.setTags(tags);
};

/** Exports the spans still batched, which a replicant killed at the end of a run would otherwise drop. */
export const flushSpanExport = async (): Promise<void> => {
  if (!observability) {
    return;
  }
  await EffectEx.runPromise(
    observability.flush().pipe(
      Effect.timeout(FLUSH_TIMEOUT),
      Effect.catch((error) => Effect.sync(() => log.warn('span export did not flush', { error }))),
    ),
  );
};
