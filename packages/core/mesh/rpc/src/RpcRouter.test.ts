//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import * as RpcTest from 'effect/unstable/rpc/RpcTest';

import { layerProtocolRpcPortClient, layerProtocolRpcPortServer } from './effect-rpc.ts';
import * as RpcRouter from './RpcRouter.ts';
import { createLinkedPorts } from './testing.ts';

class EchoRpcs extends RpcGroup.make(
  Rpc.make('echo', {
    payload: { message: Schema.String },
    success: Schema.String,
  }),
).prefix('Echo.') {}

class CounterRpcs extends RpcGroup.make(
  Rpc.make('countdown', {
    payload: { from: Schema.Int },
    success: Schema.Int,
    stream: true,
  }),
).prefix('Counter.') {}

// The client sees one flat surface; the server side is two independently registered groups.
class AllRpcs extends RpcGroup.make().merge(EchoRpcs, CounterRpcs) {}

const echoHandlers = (reply: string) =>
  EchoRpcs.toLayer(
    Effect.succeed({
      'Echo.echo': ({ message }: { message: string }) => Effect.succeed(`${reply}: ${message}`),
    }),
  );

const counterHandlers = CounterRpcs.toLayer(
  Effect.succeed({
    'Counter.countdown': ({ from }: { from: number }) =>
      Stream.fromIterable(Array.from({ length: from }, (_, i) => from - i)),
  }),
);

const makeInProcessEcho = (reply: string) => RpcTest.makeClient(EchoRpcs).pipe(Effect.provide(echoHandlers(reply)));

const serveEcho = (reply: string) => RpcRouter.serve('Echo.', EchoRpcs).pipe(Effect.provide(echoHandlers(reply)));
const serveCatchAll = (reply: string) => RpcRouter.serve('', EchoRpcs).pipe(Effect.provide(echoHandlers(reply)));
const serveCounter = RpcRouter.serve('Counter.', CounterRpcs).pipe(Effect.provide(counterHandlers));

/**
 * One transport with the router on the server end and a client for the merged group on the other,
 * both living in the test's scope. `register` runs a `serve` in a child scope and returns it so a
 * test can close the route on its own.
 */
const makeHarness = Effect.gen(function* () {
  const [clientPort, serverPort] = createLinkedPorts();
  const router = yield* Layer.build(
    RpcRouter.layerTransport.pipe(
      Layer.provideMerge(RpcRouter.layer),
      Layer.provide(layerProtocolRpcPortServer(serverPort)),
    ),
  );
  // Built into the test's scope, not `Effect.provide`d: the protocol forks its receive loop into
  // the layer's scope, which a per-effect provide would close as soon as the client is constructed.
  const protocol = yield* Layer.build(layerProtocolRpcPortClient(clientPort));
  const client = yield* RpcClient.make(AllRpcs, { disableTracing: true }).pipe(Effect.provide(protocol));

  const register = (serving: Effect.Effect<void, never, RpcRouter.RpcRouter | Scope.Scope>) =>
    Effect.gen(function* () {
      const scope = yield* Scope.fork(yield* Effect.scope, 'sequential');
      yield* serving.pipe(Effect.provide(router), Scope.provide(scope));
      return scope;
    });

  return { client, register };
});

const closeScope = (scope: Scope.Closeable) => Scope.close(scope, Exit.void);

describe('RpcRouter', () => {
  it.live(
    'routes requests to the group serving their prefix',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      yield* register(serveEcho('echo'));
      yield* register(serveCounter);

      expect(yield* client['Echo.echo']({ message: 'hi' })).toEqual('echo: hi');
      const values = yield* client['Counter.countdown']({ from: 3 }).pipe(Stream.runCollect);
      expect([...values]).toEqual([3, 2, 1]);
    }),
  );

  it.live(
    'a request with no route fails instead of hanging',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      yield* register(serveEcho('echo'));

      const exit = yield* Effect.exit(client['Counter.countdown']({ from: 1 }).pipe(Stream.runCollect));
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );

  it.live(
    'a group registered after the client connected is reachable',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      // Sent before any route exists: it may fail or, if registration wins the race, succeed.
      const early = yield* Effect.forkChild(client['Echo.echo']({ message: 'queued' }));
      yield* register(serveEcho('late'));
      yield* Fiber.await(early);

      expect(yield* client['Echo.echo']({ message: 'now' })).toEqual('late: now');
    }),
  );

  it.live(
    'closing a route scope removes it and leaves the others serving',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      const echoScope = yield* register(serveEcho('echo'));
      yield* register(serveCounter);

      yield* closeScope(echoScope);

      const exit = yield* Effect.exit(client['Echo.echo']({ message: 'gone' }));
      expect(Exit.isFailure(exit)).toBe(true);
      const values = yield* client['Counter.countdown']({ from: 2 }).pipe(Stream.runCollect);
      expect([...values]).toEqual([2, 1]);
    }),
  );

  it.live(
    'a prefix can be re-served with a different implementation',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      const first = yield* register(serveEcho('first'));
      expect(yield* client['Echo.echo']({ message: 'a' })).toEqual('first: a');

      yield* closeScope(first);
      yield* register(serveEcho('second'));
      expect(yield* client['Echo.echo']({ message: 'b' })).toEqual('second: b');
    }),
  );

  it.live(
    'the longest matching prefix wins',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      yield* register(serveCatchAll('catch-all'));
      yield* register(serveEcho('specific'));

      expect(yield* client['Echo.echo']({ message: 'x' })).toEqual('specific: x');
    }),
  );

  it.live(
    'an in-flight stream is cut off when its route closes',
    Effect.fn(function* ({ expect }) {
      const { client, register } = yield* makeHarness;
      const counterScope = yield* register(serveCounter);
      const collecting = yield* Effect.forkChild(
        client['Counter.countdown']({ from: 1_000_000 }).pipe(Stream.runCount),
      );

      yield* closeScope(counterScope);

      const exit = yield* Fiber.await(collecting);
      expect(Exit.isSuccess(exit) && exit.value === 1_000_000).toBe(false);
    }),
  );
  it.live(
    'a transport attached after a group was registered serves it',
    Effect.fn(function* ({ expect }) {
      const [clientPort, serverPort] = createLinkedPorts();
      const router = yield* Layer.build(RpcRouter.layer);
      yield* serveEcho('attached late').pipe(Effect.provide(router));
      yield* RpcRouter.attach(
        yield* Layer.build(layerProtocolRpcPortServer(serverPort)).pipe(
          Effect.map((context) => Context.get(context, RpcServer.Protocol)),
        ),
      ).pipe(Effect.provide(router));

      const protocol = yield* Layer.build(layerProtocolRpcPortClient(clientPort));
      const client = yield* RpcClient.make(AllRpcs, { disableTracing: true }).pipe(Effect.provide(protocol));
      expect(yield* client['Echo.echo']({ message: 'hi' })).toEqual('attached late: hi');
    }),
  );

  it.live(
    'the in-process client calls the handlers of every registration that supplies one',
    Effect.fn(function* ({ expect }) {
      const router = yield* Layer.build(RpcRouter.layer);
      yield* RpcRouter.serve('Echo.', EchoRpcs, {
        inProcessClient: makeInProcessEcho('in-process'),
      }).pipe(Effect.provide(echoHandlers('in-process')), Effect.provide(router));

      const client = yield* RpcRouter.client.pipe(Effect.provide(router));
      expect(
        yield* (client['Echo.echo'] as (payload: { message: string }) => Effect.Effect<string>)({ message: 'hi' }),
      ).toEqual('in-process: hi');
    }),
  );
});
