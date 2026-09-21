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
) {}

const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(
  Effect.succeed({
    reportTiming: () =>
      Effect.gen(function* () {
        const metadata = yield* RpcTiming.Metadata;
        return { queueWaitMs: metadata.queueWaitMs ?? -1 };
      }),
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
});
