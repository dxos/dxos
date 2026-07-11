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

import { log } from '@dxos/log';

// @import-as-namespace

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
  options === true || options === undefined ? {} : options;

const parseSentAt = (headers: Headers.Headers): number | undefined => {
  const raw = Headers.get(headers, RPC_TIMING_SENT_AT_HEADER);
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

/**
 * Attaches {@link RpcTimingMiddleware} to every RPC in a group. Idempotent when already applied.
 */
export const applyRpcTimingMiddleware = <G extends RpcGroup.RpcGroup<Rpc.Any>>(group: G): G => {
  const first = group.requests.values().next().value;
  if (first?.middlewares.has(RpcTimingMiddleware)) {
    return group;
  }
  return group.middleware(RpcTimingMiddleware) as G;
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
