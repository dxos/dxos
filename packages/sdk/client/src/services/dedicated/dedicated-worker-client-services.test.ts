//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { Filter, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { Client } from '../../client';
import { STORAGE_LOCK_KEY } from '../../lock-key';

import { DedicatedWorkerClientServices } from './dedicated-worker-client-services';
import { MemoryWorkerCoordiantor } from './memory-coordinator';
import type { DedicatedWorkerMessage } from './types';

/**
 * In-thread worker for testing purposes.
 */
class TestWorkerFactory extends Resource {
  // Entrypoint for dedicated worker.
  make(): MessagePort {
    log('worker-entrypoint');
    const messageChannel = new MessageChannel();

    let runtime: WorkerRuntime;
    /**
     * Client that owns the worker.
     */
    let owningClientId: string;

    const tabsProcessed = new Set<string>();

    // Lock ensures only a single worker is running.
    void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
      messageChannel.port1.onmessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
        log.info('worker got message', { type: ev.data.type });
        switch (ev.data.type) {
          case 'init': {
            owningClientId = ev.data.clientId;
            runtime = new WorkerRuntime({
              configProvider: async () => {
                return new Config(); // TODO(dmaretsky): Take using an rpc message from spawning process.
              },
              onStop: async () => {
                // Close the shared worker, lock will be released automatically.
                messageChannel.port1.close();
              },
              // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
              acquireLock: async () => {},
              releaseLock: () => {},
              automaticallyConnectWebrtc: false,
            });
            await runtime.start();
            this._ctx.onDispose(() => runtime.stop());
            messageChannel.port1.postMessage({
              type: 'ready',
              livenessLockKey: runtime.livenessLockKey,
            } satisfies DedicatedWorkerMessage);
            break;
          }
          case 'start-session': {
            if (tabsProcessed.has(ev.data.clientId)) {
              log.info('ignoring duplicate client');
              break;
            }
            tabsProcessed.add(ev.data.clientId);

            const appChannel = new MessageChannel();
            const systemChannel = new MessageChannel();

            messageChannel.port1.postMessage(
              {
                type: 'session',
                appPort: appChannel.port1,
                systemPort: systemChannel.port1,
                clientId: ev.data.clientId,
              } satisfies DedicatedWorkerMessage,
              [appChannel.port1, systemChannel.port1],
            );

            // Will block until the other side finishes the handshake.
            {
              const session = await runtime.createSession({
                systemPort: createWorkerPort({ port: systemChannel.port2 }),
                appPort: createWorkerPort({ port: appChannel.port2 }),
              });
              if (ev.data.clientId === owningClientId) {
                runtime.connectWebrtcBridge(session);
              }
            }
            break;
          }

          default:
            log.error('unknown message', { type: ev.data });
        }
      };
      messageChannel.port1.postMessage({ type: 'listening' } satisfies DedicatedWorkerMessage);
    });

    return messageChannel.port2;
  }
}

describe('DedicatedWorkerClientServices', { timeout: 1_000, retry: 0 }, () => {
  test('open & close', async () => {
    await using testWorker = await new TestWorkerFactory().open();
    await using _services = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => new MemoryWorkerCoordiantor(),
    }).open();
  });

  test('connect client', async () => {
    await using testWorker = await new TestWorkerFactory().open();
    await using services = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => new MemoryWorkerCoordiantor(),
    }).open();
    await using client = await new Client({ services }).initialize();
    await client.halo.createIdentity();
    client.spaces.default.db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await client.spaces.default.db.flush({ indexes: true });
  });

  test('two client share worker', async () => {
    const coordinator = new MemoryWorkerCoordiantor();
    await using testWorker = await new TestWorkerFactory().open();
    await using services1 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client1 = await new Client({ services: services1 }).initialize();
    const identity = await client1.halo.createIdentity();

    await using services2 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();

    expect(client2.halo.identity.get()).toEqual(identity);
    await client2.spaces.default.db.query(Filter.everything()).run();

    // TODO(dmaretskyi): tried doing DB write -> flush(indexes) -> query here but flush(indexes) doesnt work
    // const object = client1.spaces.default.db.add(Obj.make(Type.Expando, { name: 'Test' }));
    // await client1.spaces.default.db.flush({ indexes: true });
    // const objects = await client2.spaces.default.db.query(Filter.type(Type.Expando, { name: 'Test' })).run();
    // expect(objects).toHaveLength(1);
    // expect(objects[0]).toEqual(object);
  });

  test('leader goes from first client to second', async () => {
    const coordinator = new MemoryWorkerCoordiantor();
    await using testWorker = await new TestWorkerFactory().open();
    await using services1 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client1 = await new Client({ services: services1 }).initialize();
    const identity = await client1.halo.createIdentity();

    await using services2 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();
    expect(client2.halo.identity.get()).toEqual(identity);

    await client1.destroy();

    expect(client2.halo.identity.get()).toEqual(identity);
    const objects = await client2.spaces.default.db.query(Filter.everything()).run();
    expect(objects).toHaveLength(1);
  });

  // TODO(wittjosiah): Using shared storage fixes this test but that doesn't seem like a realistic solution.
  test.fails('identity subscription survives leader change', { timeout: 2_000 }, async () => {
    const coordinator = new MemoryWorkerCoordiantor();
    await using testWorker = await new TestWorkerFactory().open();
    await using services1 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client1 = await new Client({ services: services1 }).initialize();
    await client1.halo.createIdentity({ displayName: 'initial-name' });

    await using services2 = await new DedicatedWorkerClientServices({
      createWorker: () => testWorker.make(),
      createCoordinator: () => coordinator,
    }).open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();

    // Set up identity subscription before leader change.
    const updatedDisplayName = 'updated-name';
    const trigger = new Trigger();
    client2.halo.identity.subscribe((identity) => {
      if (identity?.profile?.displayName === updatedDisplayName) {
        trigger.wake();
      }
    });

    // Destroy client1 to trigger leader change.
    const reconnected = new Trigger();
    services2.reconnected.on(() => {
      reconnected.wake();
    });
    await client1.destroy();

    // Wait for client2 to reconnect to the new worker.
    await asyncTimeout(reconnected.wait(), 1000);

    // Update display name after leader change.
    await client2.halo.updateProfile({ displayName: updatedDisplayName });

    // Subscription should still receive the update.
    await asyncTimeout(trigger.wait(), 500);
    expect(client2.halo.identity.get()!.profile?.displayName).toEqual(updatedDisplayName);
  });
});
