//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcServer from '@effect/rpc/RpcServer';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

class User extends Schema.Class<User>('User')({
  id: Schema.String,
  name: Schema.String,
}) {}

class TestGroup extends RpcGroup.make(
  Rpc.make('ping', {
    success: Schema.String,
    payload: {
      message: Schema.String,
    },
  }),
  Rpc.make('getUser', {
    success: User,
    payload: {
      id: Schema.String,
    },
  }),
) {}

class GroupA extends RpcGroup.make(
  Rpc.make('ping', {
    success: Schema.String,
    payload: {
      message: Schema.String,
    },
  }),
) {}

class GroupB extends RpcGroup.make(
  Rpc.make('getUser', {
    success: User,
    payload: {
      id: Schema.String,
    },
  }),
) {}

const handlers = TestGroup.toLayer(
  Effect.gen(function* () {
    return {
      ping: ({ message }) => Effect.succeed(`pong: ${message}`),
      getUser: ({ id }) => Effect.succeed(new User({ id, name: `User ${id}` })),
    };
  }),
);

const makeMessageChannel = () =>
  Effect.gen(function* () {
    const channel = new MessageChannel();
    const port1 = channel.port1;
    const port2 = channel.port2;

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        port1.close();
        port2.close();
      }),
    );

    return { port1, port2 };
  });

describe('effect-rpc tests', () => {
  it.scoped(
    '1. just regular test with a couple rpcs',
    Effect.fnUntraced(function* () {
      const { port1, port2 } = yield* makeMessageChannel();

      const serverLayer = Layer.mergeAll(
        handlers,
        RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(port2))),
      );

      yield* RpcServer.make(TestGroup, { disableTracing: true }).pipe(Effect.provide(serverLayer), Effect.forkScoped);

      const clientLayer = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
        Layer.provide(BrowserWorker.layerPlatform(() => port1)),
      );

      yield* Effect.gen(function* () {
        const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
        const pongResult = yield* client.ping({ message: 'hello' });
        expect(pongResult).toBe('pong: hello');

        const userResult = yield* client.getUser({ id: '42' });
        expect(userResult.id).toBe('42');
        expect(userResult.name).toBe('User 42');
      }).pipe(Effect.provide(clientLayer));
    }),
  );

  // Note: Test 2 is omitted as a single message channel cannot safely multiplex multiple uncoordinated
  // effect-rpc clients sharing the same underlying `BrowserWorker` without a custom multiplexing layer.
  // It results in request ID collisions and hanging fibers since `layerProtocolWorker` uses single latch map.

  it.scoped(
    '3. two message channels to one server (simulating 2 tabs one worker)',
    Effect.fnUntraced(function* () {
      // Create two separate channels (simulating 2 tabs)
      const channel1 = yield* makeMessageChannel();
      const channel2 = yield* makeMessageChannel();

      // Start the server that handles BOTH incoming ports.
      // We can fork the server twice, once for each port, sharing the same handlers.
      const serverLayer1 = Layer.mergeAll(
        handlers,
        Layer.fresh(RpcServer.layerProtocolWorkerRunner).pipe(
          Layer.provide(BrowserWorkerRunner.layerMessagePort(channel1.port2)),
        ),
      );

      const serverLayer2 = Layer.mergeAll(
        handlers,
        Layer.fresh(RpcServer.layerProtocolWorkerRunner).pipe(
          Layer.provide(BrowserWorkerRunner.layerMessagePort(channel2.port2)),
        ),
      );

      yield* RpcServer.make(TestGroup, { disableTracing: true }).pipe(Effect.provide(serverLayer1), Effect.forkScoped);

      yield* RpcServer.make(TestGroup, { disableTracing: true }).pipe(Effect.provide(serverLayer2), Effect.forkScoped);

      // Client 1 (Tab 1)
      const clientLayer1 = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
        Layer.provide(BrowserWorker.layerPlatform(() => channel1.port1)),
      );

      yield* Effect.gen(function* () {
        const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
        const result = yield* client.ping({ message: 'tab1' });
        expect(result).toBe('pong: tab1');
      }).pipe(Effect.provide(clientLayer1));

      // Client 2 (Tab 2)
      const clientLayer2 = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
        Layer.provide(BrowserWorker.layerPlatform(() => channel2.port1)),
      );

      yield* Effect.gen(function* () {
        const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
        const result = yield* client.ping({ message: 'tab2' });
        expect(result).toBe('pong: tab2');
      }).pipe(Effect.provide(clientLayer2));
    }),
  );
});
