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
import { TRACE_PROCESSOR, type TracingBackend } from '@dxos/tracing';

/** PostHog's EU ingestion host, which serves OTLP under `/i`; `DX_POSTHOG_API_HOST` overrides it. */
const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

/**
 * Service name the PostHog dashboard "EDGE nightly join latency (spans)" filters on; renaming it
 * empties the dashboard.
 */
export const SPAN_SERVICE_NAME = 'blade-runner';

/** Bounds each step a replicant waits on before exiting, so an unreachable endpoint cannot hold up a run. */
const FLUSH_TIMEOUT = Duration.seconds(10);

let observability: Observability.Observability | undefined;
let exportBackend: TracingBackend | undefined;
const beforeFlush = new Set<() => Promise<void>>();

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
  const previousBackend = TRACE_PROCESSOR.tracingBackend;
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
  // Observability installs its backend only when traces are enabled, e.g. not under `DX_DISABLE_OBSERVABILITY`.
  if (TRACE_PROCESSOR.tracingBackend === previousBackend) {
    log.warn('span export installed no tracing backend', { service: SPAN_SERVICE_NAME });
    return;
  }
  exportBackend = TRACE_PROCESSOR.tracingBackend;
  log.info('exporting spans to PostHog', { service: SPAN_SERVICE_NAME });
};

/**
 * The backend exporting spans, for a tracer installed later to forward to: `TRACE_PROCESSOR` holds a
 * single backend, so installing another one replaces the export.
 */
export const getSpanExportBackend = (): TracingBackend | undefined => exportBackend;

/** Tags every span started from now on; used to name the EDGE a replicant runs against. */
export const setSpanTags = (tags: Record<string, string>): void => {
  observability?.setTags(tags);
};

/**
 * Runs `callback` before the final flush to end the spans it holds open, which would otherwise never be
 * exported: a joiner killed mid-sync still has its `CollectionSynchronizer.syncPeer` span open.
 */
export const onBeforeSpanFlush = (callback: () => Promise<void>): void => {
  beforeFlush.add(callback);
};

/** Exports the spans still batched, which a replicant killed at the end of a run would otherwise drop. */
export const flushSpanExport = async (): Promise<void> => {
  if (!observability) {
    return;
  }
  const exporting = observability;
  await EffectEx.runPromise(
    Effect.gen(function* () {
      // Bounded one by one, so an owner that hangs or throws cannot cost the others their spans.
      yield* Effect.forEach(
        beforeFlush,
        (callback) => bounded(Effect.tryPromise(callback), 'open spans did not end before the flush'),
        { concurrency: 'unbounded', discard: true },
      );
      yield* bounded(exporting.flush(), 'span export did not flush');
    }),
  );
};

const bounded = <A, E>(effect: Effect.Effect<A, E>, message: string): Effect.Effect<void> =>
  effect.pipe(
    Effect.timeout(FLUSH_TIMEOUT),
    Effect.asVoid,
    Effect.catch((error) => Effect.sync(() => log.warn(message, { error }))),
  );
