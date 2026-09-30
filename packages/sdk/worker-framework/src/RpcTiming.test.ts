//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as EffectRpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import { describe, expect, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Rpc from './internal/rpc.ts';
import * as RpcTiming from './RpcTiming.ts';

class TimingRpcs extends RpcGroup.make(
  EffectRpc.make('reportTiming', {
    success: Schema.Struct({
      queueWaitMs: Schema.Number,
    }),
  }),
  // A method that always fails, so the client middleware's failure path is reachable: `ensuring`
  // records a round trip for a call that never returns a result, and only a failing RPC proves it.
  EffectRpc.make('boom', {
    success: Schema.Void,
    error: Schema.String,
  }),
) {}

const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(
  Effect.succeed({
    reportTiming: () =>
      Effect.gen(function* () {
        const metadata = yield* RpcTiming.Metadata;
        return { queueWaitMs: metadata.queueWaitMs ?? -1 };
      }),
    boom: () => Effect.fail('boom'),
  }),
);

/**
 * A connected client over a fresh `MessageChannel`, with both middlewares in play.
 *
 * Shared by the tests rather than repeated, so the one cast — the client is built from the group
 * at runtime and its shape cannot be inferred through `Rpc.makeClient`'s `unknown` — lives once.
 */
const connect = async (): Promise<{
  reportTiming: (payload: Record<string, never>) => Effect.Effect<{ queueWaitMs: number }>;
  boom: (payload: Record<string, never>) => Effect.Effect<void, string>;
}> => {
  const channel = new MessageChannel();
  onTestFinished(() => {
    channel.port1.close();
    channel.port2.close();
  });

  const server = Rpc.serve(channel.port1, TimingRpcs, timingHandlers, { timing: true });
  await server.open();
  onTestFinished(() => server.close());

  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));

  return (await EffectEx.runPromise(
    Rpc.makeClient(channel.port2, TimingRpcs, { timing: true }).pipe(Scope.provide(scope)),
  )) as {
    reportTiming: (payload: Record<string, never>) => Effect.Effect<{ queueWaitMs: number }>;
    boom: (payload: Record<string, never>) => Effect.Effect<void, string>;
  };
};

describe('rpc timing middleware', () => {
  test('client stamps sent-at and server reports queue wait', async ({ expect }) => {
    const client = await connect();
    const result = await EffectEx.runPromise(client.reportTiming({}));
    expect(result.queueWaitMs).toBeGreaterThanOrEqual(0);
  });

  test('the caller records its round trip, and a reader outside the realm can see it', async ({ expect }) => {
    // Round trip is the caller's quantity: queue wait and service time are both measured on the
    // server and neither covers the transport, so nothing else says what the caller actually
    // waited. Client and server share one module instance here because both run in this process —
    // in the app they are different realms, each with its own counters.
    RpcTiming.resetStats();

    const client = await connect();
    await EffectEx.runPromise(client.reportTiming({}));

    const readout = RpcTiming.getReadout();
    expect(readout.calls).toBe(1);
    expect(readout.clientCalls).toBe(1);
    expect(readout.clientSamples).toHaveLength(1);
    expect(readout.roundTripMaxMs).toBeGreaterThanOrEqual(readout.serviceMaxMs);
    // The measurement harness evaluates this name inside each realm over CDP; without it the
    // numbers exist and nothing outside the worker can reach them.
    expect(Reflect.has(globalThis, RpcTiming.RPC_TIMING_GLOBAL)).toBe(true);
  });

  test('applyMiddleware is idempotent', () => {
    const once = RpcTiming.applyMiddleware(TimingRpcs);
    const twice = RpcTiming.applyMiddleware(once);
    expect(twice).toBe(once);
  });

  test('a call that FAILS still records its round trip', async ({ expect }) => {
    // The case the `ensuring` exists for: a call that fails after 30 s is exactly the one worth
    // seeing, and a success-path recording would drop it — reporting a healthy round trip for a
    // realm whose calls are all timing out.
    RpcTiming.resetStats();

    const client = await connect();
    const exit = await EffectEx.runPromise(Effect.exit(client.boom({})));

    expect(Exit.isFailure(exit)).toBe(true);
    // The server never produced a result, so nothing on the success path could have recorded this.
    expect(RpcTiming.getReadout().clientCalls).toBe(1);
  });

  test('getStatsSnapshot reports the maxima over the retained samples', ({ expect }) => {
    RpcTiming.resetStats();

    RpcTiming.recordSample({ tag: 'a', serviceMs: 3, queueWaitMs: 7, at: Date.now() });
    RpcTiming.recordSample({ tag: 'b', serviceMs: 11, queueWaitMs: 2, at: Date.now() });

    const snapshot = RpcTiming.getStatsSnapshot();
    expect(snapshot.maxQueueWaitMs).toBe(7);
    expect(snapshot.maxServiceMs).toBe(11);
  });

  test('both sample rings keep the most recent 100, while the totals keep counting', ({ expect }) => {
    RpcTiming.resetStats();

    // Past the ring so the eviction runs: the totals are cumulative and must NOT be truncated with
    // it, which is the whole reason a reader outside the realm differences them instead of summing
    // the samples it can see.
    for (let index = 0; index < 150; index++) {
      RpcTiming.recordSample({ tag: 'evicted', serviceMs: 1, queueWaitMs: 1, at: Date.now() });
      RpcTiming.recordClientSample({ roundTripMs: 2, at: Date.now() });
    }

    const readout = RpcTiming.getReadout();
    expect(readout.samples).toHaveLength(100);
    expect(readout.clientSamples).toHaveLength(100);
    expect(readout.calls).toBe(150);
    expect(readout.clientCalls).toBe(150);
    expect(readout.serviceSumMs).toBe(150);
    expect(readout.roundTripSumMs).toBe(300);
  });

  test('resetStats clears the totals as well as the samples', ({ expect }) => {
    RpcTiming.recordSample({ tag: 'a', serviceMs: 5, queueWaitMs: 5, at: Date.now() });
    RpcTiming.recordClientSample({ roundTripMs: 5, at: Date.now() });

    RpcTiming.resetStats();

    const readout = RpcTiming.getReadout();
    // A max cannot be differenced by the reader, so a stale one survives every later interval and
    // is the field a partial reset would leave wrong.
    expect(readout).toMatchObject({
      calls: 0,
      clientCalls: 0,
      queueWaitMaxMs: 0,
      serviceMaxMs: 0,
      roundTripMaxMs: 0,
      queueWaitSumMs: 0,
      serviceSumMs: 0,
      roundTripSumMs: 0,
    });
    expect(readout.samples).toHaveLength(0);
    expect(readout.clientSamples).toHaveLength(0);
  });

  test('isEnabled accepts a bare true and an options bag, and rejects the off states', ({ expect }) => {
    expect(RpcTiming.isEnabled(true)).toBe(true);
    expect(RpcTiming.isEnabled({ minLogMs: 10 })).toBe(true);
    expect(RpcTiming.isEnabled(false)).toBe(false);
    expect(RpcTiming.isEnabled(undefined)).toBe(false);
  });
});
