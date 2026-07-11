//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import { describe, expect, onTestFinished, test } from 'vitest';

import { makeRpcClient, serveRpcGroup } from './rpc';
import { RpcTimingMetadata, applyRpcTimingMiddleware } from './rpc-timing';

class TimingRpcs extends RpcGroup.make(
  Rpc.make('reportTiming', {
    success: Schema.Struct({
      queueWaitMs: Schema.Number,
    }),
  }),
) {}

const timingHandlers = applyRpcTimingMiddleware(TimingRpcs).toLayer(
  Effect.succeed({
    reportTiming: () =>
      Effect.gen(function* () {
        const metadata = yield* RpcTimingMetadata;
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

    const server = serveRpcGroup(channel.port1, TimingRpcs, timingHandlers, { timing: true });
    await server.open();
    onTestFinished(() => server.close());

    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => Effect.runPromise(Scope.close(scope, Exit.void)));

    const client = (await Effect.runPromise(
      makeRpcClient(channel.port2, TimingRpcs, { timing: true }).pipe(Scope.extend(scope)),
    )) as {
      reportTiming: (payload: Record<string, never>) => Effect.Effect<{ queueWaitMs: number }>;
    };

    const result = await Effect.runPromise(client.reportTiming({}));
    expect(result.queueWaitMs).toBeGreaterThanOrEqual(0);
  });

  test('applyRpcTimingMiddleware is idempotent', () => {
    const once = applyRpcTimingMiddleware(TimingRpcs);
    const twice = applyRpcTimingMiddleware(once);
    expect(twice).toBe(once);
  });
});
