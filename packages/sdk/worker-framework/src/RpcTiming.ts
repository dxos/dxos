//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Headers from 'effect/unstable/http/Headers';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcMiddleware from 'effect/unstable/rpc/RpcMiddleware';

import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

/** Cross-thread comparable send timestamp stamped by the client middleware. */
export const SENT_AT_HEADER = 'x-dxos-rpc-sent-at';

/** Per-request timing metadata available to handlers via {@link Metadata}. */
export type MetadataService = {
  readonly sentAt: number | undefined;
  readonly dispatchedAt: number;
  readonly queueWaitMs: number | undefined;
  readonly serviceMs: number | undefined;
};

export class Metadata extends Context.Service<Metadata, MetadataService>()('RpcTimingMetadata') {}

// Effect 4 moved `provides` from the options bag to a type-level config and made every middleware
// wrap-style, so the former `wrap: true` flag is gone.
export class Middleware extends RpcMiddleware.Service<Middleware, { provides: Metadata }>()('RpcTimingMiddleware', {
  requiredForClient: true,
}) {}

export type Options = {
  /**
   * Minimum queue-wait or service duration (ms) before emitting a log line.
   * Defaults to 100 — tuned for 100–1000 ms worker lag signals, not sub-10 ms noise.
   */
  readonly minLogMs?: number;
};

export type Sample = {
  readonly tag: string;
  readonly queueWaitMs: number | undefined;
  readonly serviceMs: number;
  readonly at: number;
};

export type StatsSnapshot = {
  readonly samples: ReadonlyArray<Sample>;
  readonly maxQueueWaitMs: number;
  readonly maxServiceMs: number;
};

const MAX_TIMING_SAMPLES = 100;
const timingSamples: Sample[] = [];

const QUEUE_WAIT_METRIC = 'dxos.rpc.queueWait.duration';
const SERVICE_METRIC = 'dxos.rpc.service.duration';
// Deliberately untagged. `rpc._tag` would be the interesting breakdown, but a histogram costs a
// series per bucket boundary, so one per method is an order of magnitude more series than the rest
// of the fleet's metrics combined. Per-method detail stays in the log line and getStatsSnapshot.
const DURATION_META = { unit: 's' } as const;

/**
 * Publishes one completed RPC's timings.
 * Goes through `trace.metrics`, which fans out to nothing until a collector registers, so a realm
 * without observability pays nothing. Queue wait is the realm's responsiveness signal: it is time
 * the message spent waiting for this thread rather than time spent working.
 */
const publishMetrics = (sample: Sample): void => {
  if (sample.queueWaitMs !== undefined) {
    trace.metrics.distribution(QUEUE_WAIT_METRIC, sample.queueWaitMs / 1_000, DURATION_META);
  }
  trace.metrics.distribution(SERVICE_METRIC, sample.serviceMs / 1_000, DURATION_META);
};

/** Records one completed RPC for {@link getStatsSnapshot}. */
export const recordSample = (sample: Sample): void => {
  publishMetrics(sample);
  timingSamples.push(sample);
  if (timingSamples.length > MAX_TIMING_SAMPLES) {
    timingSamples.splice(0, timingSamples.length - MAX_TIMING_SAMPLES);
  }
};

/** Returns a snapshot of samples collected by the server timing middleware. */
export const getStatsSnapshot = (): StatsSnapshot => {
  const maxQueueWaitMs = timingSamples.reduce((max, sample) => Math.max(max, sample.queueWaitMs ?? 0), 0);
  const maxServiceMs = timingSamples.reduce((max, sample) => Math.max(max, sample.serviceMs), 0);
  return {
    samples: [...timingSamples],
    maxQueueWaitMs,
    maxServiceMs,
  };
};

/** Clears collected timing samples. Intended for tests. */
export const resetStats = (): void => {
  timingSamples.length = 0;
};

const DEFAULT_MIN_LOG_MS = 100;

/** Normalizes a `boolean | Options` timing flag to an {@link Options} bag. */
export const resolveOptions = (options?: boolean | Options): Options => (typeof options === 'object' ? options : {});

const parseSentAt = (headers: Headers.Headers): number | undefined => {
  // `Headers.get` returns an `Option`, not a raw value.
  const raw = Option.getOrUndefined(Headers.get(headers, SENT_AT_HEADER));
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const shouldLog = (options: Options, queueWaitMs: number | undefined, serviceMs: number | undefined): boolean => {
  const minLogMs = options.minLogMs ?? DEFAULT_MIN_LOG_MS;
  return (queueWaitMs ?? 0) >= minLogMs || (serviceMs ?? 0) >= minLogMs;
};

// Maps a group to its timing-wrapped variant so re-application returns the same wrapped group and the
// middleware is never stacked twice. Keyed by both the original and the wrapped group so passing an
// already-wrapped group back in is a no-op.
const timedGroups = new WeakMap<object, unknown>();

/**
 * Attaches {@link Middleware} to every RPC in a group. Idempotent — applying it to an
 * already-wrapped group returns the same instance.
 */
export const applyMiddleware = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
): RpcGroup.RpcGroup<Rpc.AddMiddleware<Rpcs, typeof Middleware>> => {
  const cached = timedGroups.get(group);
  if (cached !== undefined) {
    // Cache holds the wrapped group; its element type already carries the middleware.
    return cached as RpcGroup.RpcGroup<Rpc.AddMiddleware<Rpcs, typeof Middleware>>;
  }
  const wrapped = group.middleware(Middleware);
  timedGroups.set(group, wrapped);
  timedGroups.set(wrapped, wrapped);
  return wrapped;
};

/**
 * Server-side wrap middleware: derives queue wait from the client header and service time around the handler.
 */
export const serverLayer = (options?: Options): Layer.Layer<Middleware> =>
  Layer.succeed(Middleware, (handler, { rpc, headers }) => {
    const timingOptions = resolveOptions(options);
    const sentAt = parseSentAt(headers);
    const dispatchedAt = Date.now();
    const queueWaitMs = sentAt === undefined ? undefined : Math.max(0, dispatchedAt - sentAt);

    return Effect.gen(function* () {
      const serviceStart = Date.now();
      const result = yield* Effect.provideService(handler, Metadata, {
        sentAt,
        dispatchedAt,
        queueWaitMs,
        serviceMs: undefined,
      });
      const serviceMs = Math.max(0, Date.now() - serviceStart);

      recordSample({
        tag: rpc._tag,
        queueWaitMs,
        serviceMs,
        at: dispatchedAt,
      });

      if (shouldLog(timingOptions, queueWaitMs, serviceMs)) {
        log('rpc timing', {
          tag: rpc._tag,
          queueWaitMs,
          serviceMs,
        });
      }

      return result;
    });
  });

/**
 * Client middleware: stamps {@link SENT_AT_HEADER} with `Date.now()` on every outbound RPC.
 */
export const clientLayer = (): Layer.Layer<RpcMiddleware.ForClient<Middleware>> =>
  // Effect 4 hands the client middleware `next` rather than taking the rewritten request back.
  RpcMiddleware.layerClient(Middleware, ({ next, request }) =>
    next({
      ...request,
      headers: Headers.set(request.headers, SENT_AT_HEADER, String(Date.now())),
    }),
  );

/** Whether RPC timing middleware should be enabled for the given serve/client options bag. */
export const isEnabled = (timing: boolean | Options | undefined): timing is boolean | Options =>
  timing !== undefined && timing !== false;
