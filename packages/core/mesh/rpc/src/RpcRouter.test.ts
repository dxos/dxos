//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import { describe, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { layerProtocolRpcPortServer, makeProtocolRpcPortClient } from './effect-rpc.ts';
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

describe('RpcRouter', () => {
  const setup = async () => {
    const [clientPort, serverPort] = createLinkedPorts();

    const routerRuntime = ManagedRuntime.make(
      RpcRouter.layer.pipe(Layer.provide(layerProtocolRpcPortServer(serverPort))),
    );
    onTestFinished(() => routerRuntime.dispose());
    await routerRuntime.runPromise(Effect.void);

    const clientScope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(clientScope, Exit.void)));
    const client = await EffectEx.runPromise(
      Effect.gen(function* () {
        const protocol = yield* makeProtocolRpcPortClient(clientPort);
        return yield* RpcClient.make(AllRpcs, { disableTracing: true }).pipe(
          Effect.provideService(RpcClient.Protocol, protocol),
        );
      }).pipe(Scope.provide(clientScope)),
    );

    /** Runs a `RpcRouter.serve` until the returned scope closes. */
    const register = async (serving: Effect.Effect<void, never, RpcRouter.RpcRouter | Scope.Scope>) => {
      const scope = Effect.runSync(Scope.make());
      onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
      await routerRuntime.runPromise(serving.pipe(Scope.provide(scope)));
      return scope;
    };
    const serveEcho = (reply: string) => RpcRouter.serve('Echo.', EchoRpcs).pipe(Effect.provide(echoHandlers(reply)));
    const serveCounter = RpcRouter.serve('Counter.', CounterRpcs).pipe(Effect.provide(counterHandlers));
    const serveCatchAll = (reply: string) => RpcRouter.serve('', EchoRpcs).pipe(Effect.provide(echoHandlers(reply)));

    return { client, register, serveEcho, serveCounter, serveCatchAll };
  };

  test('routes requests to the group serving their prefix', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    await register(serveEcho('echo'));
    await register(serveCounter);

    expect(await EffectEx.runPromise(client['Echo.echo']({ message: 'hi' }))).toEqual('echo: hi');
    const values = await EffectEx.runPromise(client['Counter.countdown']({ from: 3 }).pipe(Stream.runCollect));
    expect([...values]).toEqual([3, 2, 1]);
  });

  test('a request with no route fails instead of hanging', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    await register(serveEcho('echo'));

    const exit = await EffectEx.runPromise(
      Effect.exit(client['Counter.countdown']({ from: 1 }).pipe(Stream.runCollect)),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test('a group registered after the client connected is reachable', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    const early = EffectEx.runPromise(client['Echo.echo']({ message: 'queued' }).pipe(Effect.exit));
    await register(serveEcho('late'));

    // The early call raced registration, so either outcome is valid; a call after it must succeed.
    await early;
    expect(await EffectEx.runPromise(client['Echo.echo']({ message: 'now' }))).toEqual('late: now');
  });

  test('closing a route scope removes it and leaves the others serving', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    const echoScope = await register(serveEcho('echo'));
    await register(serveCounter);

    await EffectEx.runPromise(Scope.close(echoScope, Exit.void));

    const exit = await EffectEx.runPromise(Effect.exit(client['Echo.echo']({ message: 'gone' })));
    expect(Exit.isFailure(exit)).toBe(true);
    const values = await EffectEx.runPromise(client['Counter.countdown']({ from: 2 }).pipe(Stream.runCollect));
    expect([...values]).toEqual([2, 1]);
  });

  test('a prefix can be re-served with a different implementation', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    const first = await register(serveEcho('first'));
    expect(await EffectEx.runPromise(client['Echo.echo']({ message: 'a' }))).toEqual('first: a');

    await EffectEx.runPromise(Scope.close(first, Exit.void));
    await register(serveEcho('second'));
    expect(await EffectEx.runPromise(client['Echo.echo']({ message: 'b' }))).toEqual('second: b');
  });

  test('the longest matching prefix wins', async ({ expect }) => {
    const { client, register, serveEcho, serveCounter, serveCatchAll } = await setup();
    await register(serveCatchAll('catch-all'));
    await register(serveEcho('specific'));

    expect(await EffectEx.runPromise(client['Echo.echo']({ message: 'x' }))).toEqual('specific: x');
  });
});
