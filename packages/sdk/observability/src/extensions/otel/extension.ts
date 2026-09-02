//
// Copyright 2025 DXOS.org
//

import { type Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';

import { type Config, getEnvString, resolveTelemetryTag } from '@dxos/config';
import { LogLevel, log } from '@dxos/log';
import { isNode, isNonNullable } from '@dxos/util';

import buildSecrets from '../../cli-observability-secrets.json';
import { type Extension, type ExtensionApi } from '../../observability-extension';
import { getOtelLogLevel, isObservabilityDisabled, storeObservabilityDisabled } from '../../storage';
import { stubExtension } from '../stub';
import { type OtelMetrics } from './metrics';
import { type OtelDestination } from './otel';
import type * as OtelLogSink from './OtelLogSink';
import type * as OtelMetricsSink from './OtelMetricsSink';
import type * as OtelSpanSink from './OtelSpanSink';
import { RemoteMetricsForwarder } from './remote-metrics';

export type OtelWorkerMessage = OtelLogSink.Message | OtelMetricsSink.Message | OtelSpanSink.Message;

/** One-way send handle into the observability worker. */
export type OtelWorkerPort = { post: (message: OtelWorkerMessage) => void };

export type ExtensionsOptions = {
  /** For the OTEL, the name of the entity for which signals (metrics or trace) are collected. */
  serviceName: string;
  /** For the OTEL, the version of the entity for which signals (metrics or trace) are collected. */
  serviceVersion: string;
  /** For the OTEL, the environment of the entity for which signals (metrics or trace) are collected. */
  environment: string;
  config: Config;
  endpoint?: string;
  headers?: Record<string, string>;
  additionalDestinations?: OtelDestination[];
  logs?: boolean;
  /** Minimum log level to export. Defaults to INFO (i.e. info, warn, error). */
  logLevel?: LogLevel;
  observabilityWorker?: OtelWorkerPort;
  metrics?: boolean;
  traces?: boolean;
};

/** Create an OTEL-backed observability extension for logs, metrics, and/or traces. */
export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  serviceName,
  serviceVersion,
  environment,
  config,
  endpoint: _endpoint,
  headers: _headers,
  additionalDestinations = [],
  // TODO(wittjosiah): Logging integration.
  //   - logger should run even if observability is disabled
  //   - logs should be cached locally in a circular buffer
  //   - logs should be flushed to the server if user opts to include them in a bug report
  logs: logsEnabled = false,
  logLevel = LogLevel.INFO,
  observabilityWorker,
  metrics: metricsEnabled = false,
  traces: tracesEnabled = false,
}) {
  const { OtelLogs } = yield* Effect.promise(() => import('./logs'));
  const { OtelMetrics } = yield* Effect.promise(() => import('./metrics'));
  const { OtelTraces } = yield* Effect.promise(() => import('./traces'));

  const cachedDisabled = yield* Effect.promise(() => isObservabilityDisabled(serviceName));
  const disabled = cachedDisabled || isObservabilityDisabledSync(serviceName);
  const storedLogLevel = yield* Effect.promise(() => getOtelLogLevel(serviceName));
  const resolvedLogLevel =
    storedLogLevel != null ? (LogLevel[storedLogLevel.toUpperCase() as keyof typeof LogLevel] ?? logLevel) : logLevel;
  const enabledRef = yield* Ref.make(!disabled);
  const tags = new Map<string, string>();

  const rawEndpoint = isNode()
    ? (process.env.DX_OTEL_ENDPOINT ?? _endpoint ?? buildSecrets.OTEL_ENDPOINT)
    : (getEnvString(config, 'DX_OTEL_ENDPOINT') ?? _endpoint);
  // The OTLP exporter (>= 0.203) validates URLs and rejects relative paths.
  // In the browser/worker, resolve relative endpoints against the current origin
  // so callers can keep using paths like `/api/otel` for proxied deployments.
  const endpoint = !isNode() && rawEndpoint?.startsWith('/') ? resolveRelativeEndpoint(rawEndpoint) : rawEndpoint;
  const headers =
    _headers ??
    Match.value(isNode()).pipe(
      Match.when(true, () => Option.fromNullishOr(process.env.DX_OTEL_HEADERS ?? buildSecrets.OTEL_HEADERS)),
      Match.when(false, () => Option.fromNullishOr(getEnvString(config, 'DX_OTEL_HEADERS'))),
      Match.exhaustive,
      Option.map((raw) => parseHeaders(raw)),
      Option.getOrElse(() => undefined),
    );

  if (!endpoint) {
    log.info('Missing OTEL_ENDPOINT');
  }

  const destinations: OtelDestination[] = [
    ...(endpoint ? [{ endpoint, headers: headers ?? {} }] : []),
    ...additionalDestinations,
  ];
  if (destinations.length === 0) {
    return stubExtension;
  }
  log.info('otel destinations', { destinations: destinations.map(({ endpoint }) => endpoint) });

  // Matches edge's `ctx.tag` span attribute (stamped by the edge log middleware
  // when it reads the `X-DXOS-Client-Tag` header, see
  // /edge/packages/services/edge/src/log-middleware.ts).
  //
  // Stamped in TWO places:
  //   1. Resource attribute — so logs and metrics emitted from this extension
  //      also carry it, and for zero per-span cost.
  //   2. Span attribute via `tags` — because edge puts `ctx.tag` in the span-
  //      attribute context (not resource), and SigNoz indexes the two contexts
  //      separately. Stamping it on span attributes here keeps a single
  //      `ctx.tag = <value>` filter matching spans from both tiers in SigNoz
  //      without requiring qualified `attribute.ctx.tag`/`resource.ctx.tag` syntax.
  const clientTag = resolveTelemetryTag(config);
  if (clientTag) {
    tags.set('ctx.tag', clientTag);
  }

  const baseAttributes = {
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
    'dxos.process.type': detectProcessType(),
    ...(clientTag ? { 'ctx.tag': clientTag } : {}),
  };
  const sessionId = crypto.randomUUID();
  const { resource, metricsResource } = createResources(baseAttributes, sessionId);

  const remoteLogs = logsEnabled ? observabilityWorker : undefined;
  let flagTrace: ((traceId: string) => void) | undefined;
  const logs =
    logsEnabled && !remoteLogs
      ? new OtelLogs({
          destinations,
          resource,
          getTags: () => Object.fromEntries(tags),
          logLevel: resolvedLogLevel,
          onTraceFlagged: (traceId) => flagTrace?.(traceId),
        })
      : undefined;

  const remoteMetrics =
    metricsEnabled && observabilityWorker && !disabled
      ? new RemoteMetricsForwarder(observabilityWorker.post)
      : undefined;
  const metrics =
    metricsEnabled && !observabilityWorker
      ? new OtelMetrics({
          destinations,
          resource: metricsResource,
          getTags: () => Object.fromEntries(tags),
        })
      : undefined;

  const traces = tracesEnabled
    ? new OtelTraces({
        destinations,
        resource,
        getTags: () => Object.fromEntries(tags),
        spanSink: observabilityWorker
          ? { post: (record: OtelSpanSink.Span) => observabilityWorker.post(record) }
          : undefined,
      })
    : undefined;
  flagTrace = (traceId) => traces?.promote(traceId);

  const extension: Extension = {
    initialize: () =>
      Effect.sync(() => {
        if (disabled) {
          return;
        }

        if (logs) {
          log.runtimeConfig.processors.push(logs.logProcessor);
        }
        if (remoteLogs) {
          remoteLogs.post({
            type: 'otel-init',
            destinations,
            resourceAttributes: { ...baseAttributes, 'session.id': sessionId },
            logLevel: resolvedLogLevel,
            tags: Object.fromEntries(tags),
          });
        }
        if (remoteMetrics) {
          observabilityWorker?.post({
            type: 'otel-metrics-init',
            destinations,
            resourceAttributes: baseAttributes,
            tags: Object.fromEntries(tags),
          });
        }
        if (traces) {
          if (observabilityWorker) {
            observabilityWorker.post({
              type: 'otel-traces-init',
              destinations,
              resourceAttributes: { ...baseAttributes, 'session.id': sessionId },
            });
          }
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
    close: () =>
      Effect.promise(async () => {
        remoteLogs?.post({ type: 'otel-flush' });
        // Run logs/metrics close concurrently and swallow their failures so the
        // tracer provider shutdown below ALWAYS runs. Without this, a rejection
        // from logs or metrics would drop the tracer provider's BatchSpanProcessor
        // queue on process exit, manifesting as "Missing Span" in SigNoz for any
        // already-exported children.
        const results = await Promise.allSettled([logs?.close(), metrics?.close(), remoteMetrics?.close()]);
        for (const result of results) {
          if (result.status === 'rejected') {
            log.catch(result.reason);
          }
        }
        // Critical: shut down the tracer provider so BatchSpanProcessor drains its
        // queue. Otherwise spans enqueued in the last 5s (close/teardown spans)
        // are dropped on process exit.
        await traces?.close();
      }),
    flush: () =>
      Effect.promise(async () => {
        remoteLogs?.post({ type: 'otel-flush' });
        const results = await Promise.allSettled([logs?.flush(), metrics?.flush()]);
        for (const result of results) {
          if (result.status === 'rejected') {
            log.catch(result.reason);
          }
        }
        await traces?.flush();
      }),
    setTags: (incomingTags) => {
      for (const [key, value] of Object.entries(incomingTags)) {
        tags.set(key, value);
      }
      remoteLogs?.post({ type: 'otel-tags', tags: { ...incomingTags } });
    },
    get enabled() {
      return Ref.get(enabledRef).pipe(Effect.runSync);
    },
    apis: [
      { kind: 'logs', isAvailable: () => Effect.succeed(!!logs || !!remoteLogs) } satisfies ExtensionApi,
      metricsApi(metrics ?? remoteMetrics),
      traces ? ({ kind: 'traces', isAvailable: () => Effect.succeed(true) } satisfies ExtensionApi) : undefined,
    ].filter(isNonNullable),
  };

  return extension;
});

const metricsApi = (metrics: OtelMetrics | RemoteMetricsForwarder | undefined): ExtensionApi | undefined =>
  metrics
    ? ({
        kind: 'metrics',
        isAvailable: () => Effect.succeed(true),
        gauge: (name, value, tags, meta) => metrics.gauge(name, value, tags, meta),
        increment: (name, value, tags, meta) => metrics.increment(name, value, tags, meta),
        distribution: (name, value, tags, meta) => metrics.distribution(name, value, tags, meta),
        observe: (name, callback, tags, meta) => metrics.observe(name, callback, tags, meta),
      } satisfies ExtensionApi)
    : undefined;

/**
 * Builds the resource for logs/traces and the separate one for metrics.
 * Metrics omit `session.id` because a per-page-load attribute mints a new time series on every
 * reload. A separate resource is the only option: views reach datapoint attributes, not resource ones.
 */
export const createResources = (
  attributes: Record<string, string>,
  sessionId: string,
): { resource: Resource; metricsResource: Resource } => ({
  resource: defaultResource().merge(resourceFromAttributes({ ...attributes, 'session.id': sessionId })),
  metricsResource: defaultResource().merge(resourceFromAttributes(attributes)),
});

/**
 * Synchronous best-effort check for observability opt-out.
 * Prevents telemetry from being emitted before the async storage check completes.
 */
const isObservabilityDisabledSync = (serviceName: string): boolean => {
  if (isNode()) {
    return process.env.DX_DISABLE_OBSERVABILITY === 'true';
  }
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`${serviceName}/observability-disabled`) === 'true';
    }
  } catch {
    // localStorage not available (e.g., in workers).
  }
  return false;
};

/** Best-effort detection of the JavaScript execution context type. */
const detectProcessType = (): string => {
  if (isNode()) {
    return 'node';
  }
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  if (typeof (globalThis as any).ServiceWorkerGlobalScope !== 'undefined') {
    return 'service-worker';
  }
  if (typeof (globalThis as any).SharedWorkerGlobalScope !== 'undefined') {
    return 'shared-worker';
  }
  return 'dedicated-worker';
};

/**
 * Resolves a relative OTLP endpoint path against the current global origin.
 * Workers expose the same `globalThis.location` as the page that spawned them;
 * if neither is available we fall back to the original path and let the OTLP
 * exporter surface the configuration error.
 */
const resolveRelativeEndpoint = (path: string): string => {
  const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
  return origin ? `${origin}${path}` : path;
};

const parseHeaders = (unparsedHeaders: string): Record<string, string> => {
  return unparsedHeaders.split(';').reduce((acc: Record<string, string>, header) => {
    const [key, ...rest] = header.split(':');
    if (key && rest.length > 0) {
      acc[key.trim().toLowerCase()] = rest.join(':').trim();
    }

    return acc;
  }, {});
};
