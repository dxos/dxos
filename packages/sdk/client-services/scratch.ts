import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Rpc from '@effect/rpc/Rpc';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Layer from 'effect/Layer';

class User extends Schema.Class<User>('User')({ id: Schema.String, name: Schema.String }) {}
class GroupA extends RpcGroup.make(Rpc.make('ping', { success: Schema.String, payload: { message: Schema.String } })) {}
class GroupB extends RpcGroup.make(Rpc.make('getUser', { success: User, payload: { id: Schema.String } })) {}
class TestGroup extends RpcGroup.make().merge(GroupA).merge(GroupB) {}

const handlers = TestGroup.toLayer(Effect.succeed({
  ping: ({ message }) => { console.log('SERVER ping', message); return Effect.succeed(`pong: ${message}`); },
  getUser: ({ id }) => Effect.succeed(new User({ id, name: `User ${id}` })),
}));

const makeMessageChannel = (name) =>
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

Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const channel1 = yield* makeMessageChannel('channel1');
  const channel2 = yield* makeMessageChannel('channel2');

  const serverLayer1 = Layer.mergeAll(
    handlers,
    Layer.fresh(RpcServer.layerProtocolWorkerRunner).pipe(
      Layer.provide(BrowserWorkerRunner.layerMessagePort(channel1.port2 as any))
    )
  );

  const serverLayer2 = Layer.mergeAll(
    handlers,
    Layer.fresh(RpcServer.layerProtocolWorkerRunner).pipe(
      Layer.provide(BrowserWorkerRunner.layerMessagePort(channel2.port2 as any))
    )
  );

  yield* RpcServer.make(TestGroup, { disableTracing: true }).pipe(
    Effect.provide(serverLayer1),
    Effect.forkScoped,
  );

  yield* RpcServer.make(TestGroup, { disableTracing: true }).pipe(
    Effect.provide(serverLayer2),
    Effect.forkScoped,
  );

  const clientLayer1 = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
    Layer.provide(BrowserWorker.layerPlatform(() => channel1.port1 as any))
  );

  yield* Effect.gen(function* () {
    console.log("CLIENT 1 START");
    const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
    const result = yield* client.ping({ message: 'tab1' });
    console.log("CLIENT 1 RESULT", result);
  }).pipe(
    Effect.provide(clientLayer1)
  );

  const clientLayer2 = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
    Layer.provide(BrowserWorker.layerPlatform(() => channel2.port1 as any))
  );

  yield* Effect.gen(function* () {
    console.log("CLIENT 2 START");
    const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
    const result = yield* client.ping({ message: 'tab2' });
    console.log("CLIENT 2 RESULT", result);
  }).pipe(
    Effect.provide(clientLayer2)
  );

}).pipe(Effect.timeout('5 seconds'))));
