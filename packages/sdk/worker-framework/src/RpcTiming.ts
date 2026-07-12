//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Headers from '@effect/platform/Headers';
import type * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcMiddleware from '@effect/rpc/RpcMiddleware';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { log } from '@dxos/log';

/** Cross-thread comparable send timestamp stamped by the client middleware. */
export const SENT_AT_HEADER = 'x-dxos-rpc-sent-at';

/** Per-request timing metadata available to handlers via {@link Metadata}. */
export type MetadataService = {
  readonly sentAt: number | undefined;
  readonly dispatchedAt: number;
  readonly queueWaitMs: number | undefined;
  readonly serviceMs: number | undefined;
};

export class Metadata extends Context.Tag('RpcTimingMetadata')<Metadata, MetadataService>() {}

export class Middleware extends RpcMiddleware.Tag<Middleware>()('RpcTimingMiddleware', {
  wrap: true,
  provides: Metadata,
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

/** Records one completed RPC for {@link getStatsSnapshot}. */
export const recordSample = (sample: Sample): void => {
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
  Layer.succeed(
    Middleware,
    Middleware.of(({ rpc, headers, next }) => {
      const timingOptions = resolveOptions(options);
      const sentAt = parseSentAt(headers);
      const dispatchedAt = Date.now();
      const queueWaitMs = sentAt === undefined ? undefined : Math.max(0, dispatchedAt - sentAt);

      return Effect.gen(function* () {
        const serviceStart = Date.now();
        const result = yield* Effect.provideService(next, Metadata, {
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
    }),
  );

/**
 * Client middleware: stamps {@link SENT_AT_HEADER} with `Date.now()` on every outbound RPC.
 */
export const clientLayer = (): Layer.Layer<RpcMiddleware.ForClient<Middleware>> =>
  RpcMiddleware.layerClient(Middleware, ({ request }) =>
    Effect.succeed({
      ...request,
      headers: Headers.set(request.headers, SENT_AT_HEADER, String(Date.now())),
    }),
  );

/** Whether RPC timing middleware should be enabled for the given serve/client options bag. */
export const isEnabled = (timing: boolean | Options | undefined): timing is boolean | Options =>
  timing !== undefined && timing !== false;
