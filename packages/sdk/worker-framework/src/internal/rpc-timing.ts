//
// Copyright 2026 DXOS.org
//

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
export const RPC_TIMING_SENT_AT_HEADER = 'x-dxos-rpc-sent-at';

/** Per-request timing metadata available to handlers via {@link RpcTimingMetadata}. */
export type RpcTimingMetadataService = {
  readonly sentAt: number | undefined;
  readonly dispatchedAt: number;
  readonly queueWaitMs: number | undefined;
  readonly serviceMs: number | undefined;
};

export class RpcTimingMetadata extends Context.Tag('RpcTimingMetadata')<
  RpcTimingMetadata,
  RpcTimingMetadataService
>() {}

export class RpcTimingMiddleware extends RpcMiddleware.Tag<RpcTimingMiddleware>()('RpcTimingMiddleware', {
  wrap: true,
  provides: RpcTimingMetadata,
  requiredForClient: true,
}) {}

export type RpcTimingOptions = {
  /**
   * Minimum queue-wait or service duration (ms) before emitting a log line.
   * Defaults to 100 — tuned for 100–1000 ms worker lag signals, not sub-10 ms noise.
   */
  readonly minLogMs?: number;
};

const DEFAULT_MIN_LOG_MS = 100;

const resolveOptions = (options?: boolean | RpcTimingOptions): RpcTimingOptions =>
  typeof options === 'object' ? options : {};

const parseSentAt = (headers: Headers.Headers): number | undefined => {
  // `Headers.get` returns an `Option`, not a raw value.
  const raw = Option.getOrUndefined(Headers.get(headers, RPC_TIMING_SENT_AT_HEADER));
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const shouldLog = (
  options: RpcTimingOptions,
  queueWaitMs: number | undefined,
  serviceMs: number | undefined,
): boolean => {
  const minLogMs = options.minLogMs ?? DEFAULT_MIN_LOG_MS;
  return (queueWaitMs ?? 0) >= minLogMs || (serviceMs ?? 0) >= minLogMs;
};

// Maps a group to its timing-wrapped variant so re-application returns the same wrapped group and the
// middleware is never stacked twice. Keyed by both the original and the wrapped group so passing an
// already-wrapped group back in is a no-op.
const timedGroups = new WeakMap<object, unknown>();

/**
 * Attaches {@link RpcTimingMiddleware} to every RPC in a group. Idempotent — applying it to an
 * already-wrapped group returns the same instance.
 */
export const applyRpcTimingMiddleware = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
): RpcGroup.RpcGroup<Rpc.AddMiddleware<Rpcs, typeof RpcTimingMiddleware>> => {
  const cached = timedGroups.get(group);
  if (cached !== undefined) {
    // Cache holds the wrapped group; its element type already carries the middleware.
    return cached as RpcGroup.RpcGroup<Rpc.AddMiddleware<Rpcs, typeof RpcTimingMiddleware>>;
  }
  const wrapped = group.middleware(RpcTimingMiddleware);
  timedGroups.set(group, wrapped);
  timedGroups.set(wrapped, wrapped);
  return wrapped;
};

/**
 * Server-side wrap middleware: derives queue wait from the client header and service time around the handler.
 */
export const rpcTimingServerLayer = (options?: RpcTimingOptions): Layer.Layer<RpcTimingMiddleware> =>
  Layer.succeed(
    RpcTimingMiddleware,
    RpcTimingMiddleware.of(({ rpc, headers, next }) => {
      const timingOptions = resolveOptions(options);
      const sentAt = parseSentAt(headers);
      const dispatchedAt = Date.now();
      const queueWaitMs = sentAt === undefined ? undefined : Math.max(0, dispatchedAt - sentAt);

      return Effect.gen(function* () {
        const serviceStart = Date.now();
        const result = yield* Effect.provideService(next, RpcTimingMetadata, {
          sentAt,
          dispatchedAt,
          queueWaitMs,
          serviceMs: undefined,
        });
        const serviceMs = Math.max(0, Date.now() - serviceStart);

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
 * Client middleware: stamps {@link RPC_TIMING_SENT_AT_HEADER} with `Date.now()` on every outbound RPC.
 */
export const rpcTimingClientLayer = (): Layer.Layer<RpcMiddleware.ForClient<RpcTimingMiddleware>> =>
  RpcMiddleware.layerClient(RpcTimingMiddleware, ({ request }) =>
    Effect.succeed({
      ...request,
      headers: Headers.set(request.headers, RPC_TIMING_SENT_AT_HEADER, String(Date.now())),
    }),
  );

/** Whether RPC timing middleware should be enabled for the given serve/client options bag. */
export const isRpcTimingEnabled = (
  timing: boolean | RpcTimingOptions | undefined,
): timing is boolean | RpcTimingOptions => timing !== undefined && timing !== false;

export const resolveRpcTimingOptions = resolveOptions;
