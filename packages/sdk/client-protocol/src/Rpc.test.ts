//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as EffectRpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { describe, expect, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { type LogConfig, type LogEntry, log } from '@dxos/log';

import * as Rpc from './Rpc.ts';

class TestRpcs extends RpcGroup.make(
  EffectRpc.make('fail', { payload: { reason: Schema.String } }),
  EffectRpc.make('ticks', { success: Schema.Number, stream: true }),
) {}

describe('Rpc.serve', () => {
  test.each([
    ['serve', false],
    ['serve', true],
    ['serverLayer', false],
    ['serverLayer', true],
  ] as const)(
    'a handler defect fails only its own request and is logged with its rpc (%s, timing: %s)',
    async (kind, timing) => {
      const defects: Record<string, unknown>[] = [];
      onTestFinished(
        log.addProcessor((_config: LogConfig, entry: LogEntry) => {
          if (entry.message === 'rpc handler defect') {
            defects.push(entry.computedContext);
          }
        }),
      );

      const channel = new MessageChannel();
      onTestFinished(() => {
        channel.port1.close();
        channel.port2.close();
      });

      const ticks = Effect.runSync(Queue.unbounded<number>());
      const handlers = TestRpcs.toLayer(
        Effect.succeed({
          fail: ({ reason }: { reason: string }) => Effect.promise(() => Promise.reject(new Error(reason))),
          ticks: () => Stream.fromQueue(ticks),
        }),
      );
      if (kind === 'serve') {
        const server = Rpc.serve(channel.port1, TestRpcs, handlers, { timing });
        await server.open();
        onTestFinished(() => server.close());
      } else {
        const protocol = RpcServer.layerProtocolWorkerRunner.pipe(
          Layer.provide(BrowserWorkerRunner.layerMessagePort(channel.port1)),
        );
        const fiber = Effect.runFork(
          Layer.launch(Rpc.serverLayer(TestRpcs, handlers, { timing }).pipe(Layer.provide(protocol))),
        );
        onTestFinished(() => EffectEx.runPromise(Fiber.interrupt(fiber)));
      }

      const scope = Effect.runSync(Scope.make());
      onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
      const client = await EffectEx.runPromise(
        Effect.gen(function* () {
          const protocol = yield* Layer.build(
            RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
              Layer.provide(BrowserWorker.layer(() => channel.port2)),
            ),
          );
          return yield* RpcClient.make(TestRpcs, { disableTracing: true }).pipe(Effect.provide(protocol));
        }).pipe(Scope.provide(scope)),
      );

      const received: number[] = [];
      const subscription = Effect.runFork(
        client.ticks().pipe(Stream.runForEach((tick) => Effect.sync(() => received.push(tick)))),
      );
      onTestFinished(() => subscription.interruptUnsafe());
      Queue.offerUnsafe(ticks, 1);
      await expect.poll(() => received).toEqual([1]);

      const exit = await Effect.runPromiseExit(client.fail({ reason: 'handler failed' }));
      expect(Exit.isFailure(exit) ? Cause.pretty(exit.cause) : 'succeeded').toContain('handler failed');
      expect(defects).toEqual([
        expect.objectContaining({ rpc: 'fail', cause: expect.stringContaining('handler failed') }),
      ]);

      Queue.offerUnsafe(ticks, 2);
      await expect.poll(() => received).toEqual([1, 2]);
    },
  );
});
