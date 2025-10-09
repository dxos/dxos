//
// Copyright 2025 DXOS.org
//

import { Effect, Ref } from 'effect';

import { type Config } from '@dxos/config';
import { LogLevel, log } from '@dxos/log';
import { isNode, isNonNullable } from '@dxos/util';

import buildSecrets from '../../cli-observability-secrets.json';
import { type Extension, type ExtensionApi } from '../../observability-extension';
import { isObservabilityDisabled, storeObservabilityDisabled } from '../../storage';
import { stubExtension } from '../stub';

// TODO(wittjosiah): Environment & release version attributes.

export type ExtensionsOptions = {
  serviceName: string;
  serviceVersion: string;
  config: Config;
  endpoint?: string;
  headers?: Record<string, string>;
  logs?: boolean;
  metrics?: boolean;
  traces?: boolean;
};

export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  serviceName,
  serviceVersion,
  config,
  endpoint: _endpoint,
  headers: _headers,
  // TODO(wittjosiah): Logging integration.
  //   - logger should run even if observability is disabled
  //   - logs should be cached locally in a circular buffer
  //   - logs should be flushed to the server if user opts to include them in a bug report
  logs: logsEnabled = false,
  metrics: metricsEnabled = true,
  traces: tracesEnabled = true,
}) {
  const { OtelLogs } = yield* Effect.promise(() => import('./logs'));
  const { OtelMetrics } = yield* Effect.promise(() => import('./metrics'));
  const { OtelTraces } = yield* Effect.promise(() => import('./traces'));

  const cachedDisabled = yield* Effect.promise(() => isObservabilityDisabled(serviceName));
  const enabledRef = yield* Ref.make(!cachedDisabled);
  const tags = new Map<string, string>();

  const endpoint = isNode()
    ? (process.env.DX_OTEL_ENDPOINT ?? _endpoint ?? buildSecrets.OTEL_ENDPOINT)
    : config.get('runtime.app.env.DX_OTEL_ENDPOINT');
  const unparsedHeaders = isNode()
    ? (process.env.DX_OTEL_HEADERS ?? _headers ?? buildSecrets.OTEL_HEADERS)
    : config.get('runtime.app.env.DX_OTEL_HEADERS');
  const headers = parseHeaders(unparsedHeaders);

  if (!endpoint || !headers) {
    log.warn('Missing OTEL_ENDPOINT or OTEL_HEADERS');
    return stubExtension;
  }

  const logs = logsEnabled
    ? new OtelLogs({
        endpoint,
        headers,
        serviceName,
        serviceVersion,
        getTags: () => Object.fromEntries(tags),
        logLevel: LogLevel.VERBOSE,
        includeSharedWorkerLogs: false,
      })
    : undefined;

  const metrics = metricsEnabled
    ? new OtelMetrics({
        endpoint,
        headers,
        serviceName,
        serviceVersion,
        getTags: () => Object.fromEntries(tags),
      })
    : undefined;

  const traces = tracesEnabled
    ? new OtelTraces({
        endpoint,
        headers,
        serviceName,
        serviceVersion,
        getTags: () => Object.fromEntries(tags),
      })
    : undefined;

  return {
    initialize: Effect.fn(function* () {
      if (logs) {
        log.runtimeConfig.processors.push(logs.logProcessor);
      }
      if (traces) {
        traces.start();
      }
    }),
    enable: Effect.fn(function* () {
      yield* Effect.promise(() => storeObservabilityDisabled(serviceName, false));
      yield* Ref.update(enabledRef, () => true);
    }),
    disable: Effect.fn(function* () {
      yield* Effect.promise(() => storeObservabilityDisabled(serviceName, true));
      yield* Ref.update(enabledRef, () => false);
    }),
    close: () => Effect.promise(async () => logs?.close()),
    flush: () => Effect.promise(async () => logs?.flush()),
    setTags: (incomingTags) => {
      for (const [key, value] of Object.entries(incomingTags)) {
        tags.set(key, value);
      }
    },
    get enabled() {
      return Ref.get(enabledRef).pipe(Effect.runSync);
    },
    apis: [
      logs ? ({ kind: 'logs' } satisfies ExtensionApi) : undefined,
      metrics
        ? ({
            kind: 'metrics',
            gauge: (name, value, tags) => metrics.gauge(name, value, tags),
            increment: (name, value, tags) => metrics.increment(name, value, tags),
            distribution: (name, value, tags) => metrics.distribution(name, value, tags),
          } satisfies ExtensionApi)
        : undefined,
      traces ? ({ kind: 'traces' } satisfies ExtensionApi) : undefined,
    ].filter(isNonNullable),
  };
});

const parseHeaders = (unparsedHeaders: string): Record<string, string> => {
  return unparsedHeaders.split(';').reduce((acc: Record<string, string>, header) => {
    const [key, ...rest] = header.split(':');
    if (key && rest.length > 0) {
      acc[key.trim().toLowerCase()] = rest.join(':').trim();
    }

    return acc;
  }, {});
};
