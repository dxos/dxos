//
// Copyright 2026 DXOS.org
//

import * as EffectRpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import { describe, expect, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Rpc from './internal/rpc';
import * as RpcTiming from './RpcTiming';

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

describe('rpc timing middleware', () => {
  test('client stamps sent-at and server reports queue wait', async () => {
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

    const client = (await EffectEx.runPromise(
      Rpc.makeClient(channel.port2, TimingRpcs, { timing: true }).pipe(Scope.extend(scope)),
    )) as {
      reportTiming: (payload: Record<string, never>) => Effect.Effect<{ queueWaitMs: number }>;
    };

    const result = await EffectEx.runPromise(client.reportTiming({}));
    expect(result.queueWaitMs).toBeGreaterThanOrEqual(0);
  });

  test('applyMiddleware is idempotent', () => {
    const once = RpcTiming.applyMiddleware(TimingRpcs);
    const twice = RpcTiming.applyMiddleware(once);
    expect(twice).toBe(once);
  });
});
