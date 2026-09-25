//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
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
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { EffectEx } from '@dxos/effect';

import { layerProtocolRpcPortServer, makeProtocolRpcPortClient } from './effect-rpc.ts';
import { createLinkedPorts } from './testing.ts';

class TestError extends Schema.TaggedError<TestError>()('TestError', {
  message: Schema.String,
  code: Schema.Int,
}) {}

class TestRpcs extends RpcGroup.make(
  Rpc.make('echo', {
    payload: { message: Schema.String, bytes: Schema.Uint8Array },
    success: Schema.Struct({ message: Schema.String, bytes: Schema.Uint8Array }),
  }),
  Rpc.make('countdown', {
    payload: { from: Schema.Int },
    success: Schema.Int,
    stream: true,
  }),
  Rpc.make('fail', {
    payload: { code: Schema.Int },
    success: Schema.String,
    error: TestError,
  }),
  Rpc.make('die', {
    payload: { message: Schema.String },
    success: Schema.String,
  }),
) {}

const handlers = TestRpcs.toLayer(
  Effect.succeed({
    echo: ({ message, bytes }: { message: string; bytes: Uint8Array }) =>
      Effect.succeed({ message: `echo: ${message}`, bytes: bytes.map((byte) => byte + 1) }),
    countdown: ({ from }: { from: number }) => Stream.fromIterable(Array.from({ length: from }, (_, i) => from - i)),
    fail: ({ code }: { code: number }) => Effect.fail(new TestError({ message: 'expected failure', code })),
    die: ({ message }: { message: string }) => Effect.die(new Error(message)),
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
      }).pipe(Scope.provide(scope)),
    );

    const [client] = await Promise.all([clientPromise, startServer()]);
    return client;
  };

  test('unary round trip', async ({ expect }) => {
    const client = await setup();
    const result = await EffectEx.runPromise(client.echo({ message: 'hello', bytes: new Uint8Array([1, 2, 3]) }));
    expect(result).toEqual({ message: 'echo: hello', bytes: new Uint8Array([2, 3, 4]) });
  });

  test('stream round trip', async ({ expect }) => {
    const client = await setup();
    const values = await EffectEx.runPromise(client.countdown({ from: 3 }).pipe(Stream.runCollect));
    expect([...values]).toEqual([3, 2, 1]);
  });

  test('typed failure round trip', async ({ expect }) => {
    const client = await setup();
    const error = await EffectEx.runPromise(client.fail({ code: 7 }).pipe(Effect.flip));
    expect(error).toBeInstanceOf(TestError);
    expect(error).toMatchObject({ _tag: 'TestError', message: 'expected failure', code: 7 });
  });

  test('defect round trip', async ({ expect }) => {
    const client = await setup();
    const exit = await EffectEx.runPromise(client.die({ message: 'boom' }).pipe(Effect.exit));
    expect(Exit.isFailure(exit)).toBe(true);
    const defect = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
    expect(defect).toBeInstanceOf(Error);
    expect(defect).toMatchObject({ message: 'boom' });

    // The connection survives a defect in one handler.
    const result = await EffectEx.runPromise(client.echo({ message: 'after', bytes: new Uint8Array() }));
    expect(result.message).toEqual('echo: after');
  });

  test('client connects when the server attaches late', async ({ expect }) => {
    // The client retries its handshake Ping until the server starts listening.
    const client = await setup({ serverDelay: 700 });
    const result = await EffectEx.runPromise(client.echo({ message: 'late', bytes: new Uint8Array() }));
    expect(result.message).toEqual('echo: late');
  });
});
