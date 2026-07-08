//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { describe, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { ClientRpcServer, type ClientServices, makeClientServicesClient } from '@dxos/client-protocol';
import { Stream as PbStream } from '@dxos/codec-protobuf/stream';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { IdentityNotInitializedError, TimeoutError } from '@dxos/protocols';
import {
  type QueryStatusResponse,
  type SpacesService,
  SpaceState,
  type SystemService,
  SystemStatus,
} from '@dxos/protocols/proto/dxos/client/services';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { createLinkedPorts } from '@dxos/rpc';

describe('client services effect-rpc', () => {
  test('unary call round trip preserves substituted types', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    const proxy = await setup(() => ({
      SpacesService: mockService<SpacesService>({
        createSpace: async () => ({
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
    // PublicKey instances must survive the transport (protobuf-encoded payloads).
    expect(space.spaceKey).toBeInstanceOf(PublicKey);
    expect(space.spaceKey.equals(spaceKey)).toBe(true);
  });

  test('streaming call round trip', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService>({
        queryStatus: () =>
          new PbStream<QueryStatusResponse>(({ next, close }) => {
            next({ status: SystemStatus.INACTIVE });
            next({ status: SystemStatus.ACTIVE });
            close();
          }),
      }),
    }));

    const statuses = await PbStream.consumeData(proxy.SystemService!.queryStatus({}));
    expect(statuses.map((update) => update.status)).toEqual([SystemStatus.INACTIVE, SystemStatus.ACTIVE]);
  });

  test('stream errors propagate to the consumer', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService>({
        queryStatus: () =>
          new PbStream<QueryStatusResponse>(({ next, close }) => {
            next({ status: SystemStatus.ACTIVE });
            close(new Error('stream failed'));
          }),
      }),
    }));

    await expect(PbStream.consumeData(proxy.SystemService!.queryStatus({}))).rejects.toThrow('stream failed');
  });

  test('typed errors keep their identity across the wire', async ({ expect }) => {
    const proxy = await setup(() => ({
      SystemService: mockService<SystemService>({
        getConfig: async () => {
          throw new IdentityNotInitializedError({ message: 'no identity' });
        },
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
    await expect(proxy.SystemService!.getConfig()).rejects.toThrow('Service not available: SystemService');
  });

  test('onRequest gates dispatch until ready', async ({ expect }) => {
    const ready = new Trigger();
    let called = false;
    const proxy = await setup(
      () => ({
        SystemService: mockService<SystemService>({
          getConfig: async () => {
            called = true;
            return {};
          },
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
      SystemService: mockService<SystemService>({
        getConfig: () => new Promise(() => {}), // Never resolves.
      }),
    }));

    await expect(proxy.SystemService!.getConfig(undefined, { timeout: 100 })).rejects.toThrow(TimeoutError);
  });
});

// Test mocks implement only the methods under test; the wire dispatches by method name.
const mockService = <T>(partial: Partial<T>): T => partial as T;

const setup = async (services: () => Partial<ClientServices>, options?: { onRequest?: () => Promise<void> }) => {
  const [proxyPort, serverPort] = createLinkedPorts();

  const server = new ClientRpcServer({ services, port: serverPort, onRequest: options?.onRequest });
  await server.open();
  onTestFinished(() => server.close());

  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const proxy = await EffectEx.runPromise(makeClientServicesClient(proxyPort).pipe(Scope.extend(scope)));

  return proxy;
};
