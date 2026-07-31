//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { EffectEx } from '@dxos/effect';

import { layerProtocolRpcPortServer, makeProtocolRpcPortClient } from './effect-rpc';
import { createLinkedPorts } from './testing';

class TestRpcs extends RpcGroup.make(
  Rpc.make('echo', {
    payload: { message: Schema.String },
    success: Schema.String,
  }),
  Rpc.make('countdown', {
    payload: { from: Schema.Int },
    success: Schema.Int,
    stream: true,
  }),
) {}

const handlers = TestRpcs.toLayer(
  Effect.succeed({
    echo: ({ message }: { message: string }) => Effect.succeed(`echo: ${message}`),
    countdown: ({ from }: { from: number }) => Stream.fromIterable(Array.from({ length: from }, (_, i) => from - i)),
  }),
);

describe('effect-rpc over RpcPort', () => {
  const setup = async (options?: { serverDelay?: number }) => {
    const [clientPort, serverPort] = createLinkedPorts();

    const serverLayer = RpcServer.layer(TestRpcs, { disableTracing: true }).pipe(
      Layer.provide(handlers),
      Layer.provide(layerProtocolRpcPortServer(serverPort)),
    );
    const serverRuntime = ManagedRuntime.make(serverLayer);
    onTestFinished(() => serverRuntime.dispose());
    const startServer = async () => {
      if (options?.serverDelay) {
        await sleep(options.serverDelay);
      }
      await serverRuntime.runPromise(Effect.void);
    };

    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
    const clientPromise = EffectEx.runPromise(
      Effect.gen(function* () {
        const protocol = yield* makeProtocolRpcPortClient(clientPort);
        return yield* RpcClient.make(TestRpcs, { disableTracing: true }).pipe(
          Effect.provideService(RpcClient.Protocol, protocol),
        );
      }).pipe(Scope.extend(scope)),
    );

    const [client] = await Promise.all([clientPromise, startServer()]);
    return client;
  };

  test('unary round trip', async ({ expect }) => {
    const client = await setup();
    const result = await EffectEx.runPromise(client.echo({ message: 'hello' }));
    expect(result).toEqual('echo: hello');
  });

  test('stream round trip', async ({ expect }) => {
    const client = await setup();
    const values = await EffectEx.runPromise(client.countdown({ from: 3 }).pipe(Stream.runCollect));
    expect([...values]).toEqual([3, 2, 1]);
  });

  test('client connects when the server attaches late', async ({ expect }) => {
    // The client retries its handshake Ping until the server starts listening.
    const client = await setup({ serverDelay: 700 });
    const result = await EffectEx.runPromise(client.echo({ message: 'late' }));
    expect(result).toEqual('echo: late');
  });
});
