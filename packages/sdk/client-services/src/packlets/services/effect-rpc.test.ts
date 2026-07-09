//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import {
  ClientRpcServer,
  type ClientServicesHandlers,
  type ClientServicesRpc,
  makeClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { Stream as PbStream } from '@dxos/codec-protobuf/stream';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { IdentityNotInitializedError, TimeoutError } from '@dxos/protocols';
import { type QueryStatusResponse, SpaceState, SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SpacesService, SystemService } from '@dxos/protocols/rpc';
import { createLinkedPorts } from '@dxos/rpc';

//
// Helpers & Schema for test suite 2
//

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

//
// Helpers for test suite 1
//

const mockService = <T>(partial: Partial<T>): T => partial as T;

const setupRpc = async (
  services: () => Partial<ClientServicesHandlers>,
  options?: { onRequest?: () => Promise<void> },
): Promise<ClientServicesRpc> => {
  const [proxyPort, serverPort] = createLinkedPorts();

  const server = new ClientRpcServer({ services, port: serverPort, onRequest: options?.onRequest });
  await server.open();
  onTestFinished(() => server.close());

  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  return EffectEx.runPromise(makeClientServicesRpc(proxyPort).pipe(Scope.extend(scope)));
};

const setup = async (
  services: () => Partial<ClientServicesHandlers>,
  options?: { onRequest?: () => Promise<void> },
) => {
  const rpc = await setupRpc(services, options);
  return makeServicesFromRpc(rpc, Runtime.defaultRuntime);
};

//
// Test Suites
//

describe('client services effect-rpc', () => {
  test('unary call round trip preserves substituted types', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    const proxy = await setup(() => ({
      SpacesService: mockService<SpacesService.Handlers>({
        ['SpacesService.createSpace']: () =>
          Effect.succeed({
            id: 'test-space',
            spaceKey,
            state: SpaceState.SPACE_READY,
            membershipPolicy: MembershipPolicy.INVITE,
            metrics: {},
          }),
      }),
    }));

    const space = await proxy.SpacesService!.createSpace({ membershipPolicy: MembershipPolicy.INVITE });
    expect(space.id).toEqual('test-space');
    expect(space.spaceKey).toBeInstanceOf(PublicKey);
    expect(space.spaceKey.equals(spaceKey)).toBe(true);
  });

  test('streaming call round trip', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService.Handlers>({
        ['SystemService.queryStatus']: (): Stream.Stream<QueryStatusResponse, Error> =>
          Stream.fromIterable([{ status: SystemStatus.INACTIVE }, { status: SystemStatus.ACTIVE }]),
      }),
    }));

    const statuses = await PbStream.consumeData(proxy.SystemService!.queryStatus({}));
    expect(statuses.map((update) => update.status)).toEqual([SystemStatus.INACTIVE, SystemStatus.ACTIVE]);
  });

  test('stream errors propagate to the consumer', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService.Handlers>({
        ['SystemService.queryStatus']: (): Stream.Stream<QueryStatusResponse, Error> =>
          Stream.make({ status: SystemStatus.ACTIVE }).pipe(Stream.concat(Stream.fail(new Error('stream failed')))),
      }),
    }));

    await expect(PbStream.consumeData(proxy.SystemService!.queryStatus({}))).rejects.toThrow('stream failed');
  });

  test('typed errors keep their identity across the wire', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService.Handlers>({
        ['SystemService.getConfig']: () => Effect.fail(new IdentityNotInitializedError({ message: 'no identity' })),
      }),
    }));

    const error = await proxy.SystemService!.getConfig().then(
      () => undefined,
      (err) => err,
    );
    expect(error).toBeInstanceOf(IdentityNotInitializedError);
    expect(error.message).toContain('no identity');
  });

  test('calls fail when the service is not available', async ({ expect }) => {
    const proxy = await setup(() => ({}));
    await expect(proxy.SystemService!.getConfig()).rejects.toThrow(
      'Service handler not available: SystemService.getConfig',
    );
  });

  test('onRequest gates dispatch until ready', async ({ expect }) => {
    const ready = new Trigger();
    let called = false;
    const proxy = await setup(
      () => ({
        SystemService: mockService<SystemService.Handlers>({
          ['SystemService.getConfig']: () =>
            Effect.sync(() => {
              called = true;
              return {};
            }),
        }),
      }),
      { onRequest: () => ready.wait() },
    );

    const request = proxy.SystemService!.getConfig();
    await sleep(50);
    expect(called).toBe(false);

    ready.wake();
    await request;
    expect(called).toBe(true);
  });

  test('per-call timeout', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService.Handlers>({
        ['SystemService.getConfig']: () => Effect.never,
      }),
    }));

    await expect(proxy.SystemService!.getConfig(undefined, { timeout: 100 })).rejects.toThrow(TimeoutError);
  });

  test('effect-native rpc surface: unary and stream', async ({ expect }) => {
    const rpc = await setupRpc(() => ({
      SystemService: mockService<SystemService.Handlers>({
        ['SystemService.getConfig']: () =>
          Effect.succeed({ runtime: { client: { remoteSource: 'https://example.com' } } }),
        ['SystemService.queryStatus']: (): Stream.Stream<QueryStatusResponse, Error> =>
          Stream.make({ status: SystemStatus.ACTIVE }),
      }),
    }));

    const config = await EffectEx.runPromise(rpc.SystemService.getConfig(undefined));
    expect(config.runtime?.client?.remoteSource).toEqual('https://example.com');

    const statuses = await EffectEx.runPromise(rpc.SystemService.queryStatus({}).pipe(Stream.runCollect));
    expect([...statuses].map((update) => update.status)).toEqual([SystemStatus.ACTIVE]);
  });
});

describe('effect-rpc tests', () => {
  test(
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

  test(
    '3. two message channels to one server (simulating 2 tabs one worker)',
    Effect.fnUntraced(function* () {
      const channel1 = yield* makeMessageChannel();
      const channel2 = yield* makeMessageChannel();

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

      const clientLayer1 = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
        Layer.provide(BrowserWorker.layerPlatform(() => channel1.port1)),
      );

      yield* Effect.gen(function* () {
        const client = yield* RpcClient.make(TestGroup, { disableTracing: true });
        const result = yield* client.ping({ message: 'tab1' });
        expect(result).toBe('pong: tab1');
      }).pipe(Effect.provide(clientLayer1));

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
