//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
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
import type { DedicatedWorkerMessage, WorkerCoordinator, WorkerCoordinatorMessage } from './types';

/**
 * Coordinator that simulates async message delivery like SharedWorkerCoordinator.
 * Messages are delivered via queueMicrotask to simulate the round-trip through a shared worker.
 */
class AsyncMemoryCoordinator implements WorkerCoordinator {
  readonly onMessage = new Event<WorkerCoordinatorMessage>();

  sendMessage(message: WorkerCoordinatorMessage): void {
    log.info('async coordinator got message', { type: message.type });
    // Simulate async delivery like real SharedWorkerCoordinator.
    queueMicrotask(() => {
      this.onMessage.emit(message);
    });
  }
}

/**
 * In-thread worker for testing purposes.
 * Simulates a dedicated worker that persists across leader changes.
 */
class TestWorkerFactory extends Resource {
  // Shared state across all make() calls - simulates the persistent dedicated worker.
  #runtime: WorkerRuntime | undefined = undefined;
  #owningClientId: string | undefined = undefined;

  // Entrypoint for dedicated worker.
  make(): MessagePort {
    log('worker-entrypoint', { makeCallId: crypto.randomUUID().slice(0, 8) });
    const messageChannel = new MessageChannel();

    // Track tabs processed for THIS connection only (resets when leader changes).
    const tabsProcessed = new Set<string>();

    // Lock ensures only a single worker is running.
    void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
      messageChannel.port1.onmessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
        log.info('worker got message', { type: ev.data.type });
        switch (ev.data.type) {
          case 'init': {
            this.#owningClientId = ev.data.clientId;
            // Only create runtime once - persist across leader changes.
            if (!this.#runtime) {
              this.#runtime = new WorkerRuntime({
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
              await this.#runtime.start();
              this._ctx.onDispose(() => this.#runtime?.stop());
            }
            messageChannel.port1.postMessage({
              type: 'ready',
              livenessLockKey: this.#runtime.livenessLockKey,
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
              const session = await this.#runtime!.createSession({
                systemPort: createWorkerPort({ port: systemChannel.port2 }),
                appPort: createWorkerPort({ port: appChannel.port2 }),
              });
              if (ev.data.clientId === this.#owningClientId) {
                this.#runtime!.connectWebrtcBridge(session);
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

describe('DedicatedWorkerClientServices (browser)', { timeout: 30_000, retry: 0 }, () => {
  test('open & close', async () => {
    await using testWorker = await new TestWorkerFactory().open();
    await using services = await new DedicatedWorkerClientServices({
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
    await client.spaces.waitUntilReady();
    client.spaces.default.db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await client.spaces.default.db.flush({ indexes: true });
  });

  test('two clients share worker', async () => {
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
  });

  test('leader goes from first client to second (async coordinator)', async () => {
    const coordinator = new AsyncMemoryCoordinator();
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

    // Set up listener for reconnection before destroying client1.
    const reloaded = new Promise<void>((resolve) => {
      client2.reloaded.on(() => resolve());
    });

    await client1.destroy();

    // Wait for client2 to reconnect before querying.
    await reloaded;
    await client2.spaces.waitUntilReady();
    await client2.spaces.default.db.query(Filter.everything()).run();
  });

  test('UI subscription pattern: identity subscription receives updates after reconnection', async () => {
    const coordinator = new AsyncMemoryCoordinator();
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

    // Verify identity is available before we start.
    expect(client2.halo.identity.get()).toEqual(identity);

    // UI pattern: Subscribe to identity BEFORE leader change (like React useEffect).
    // This simulates how UI components subscribe to observables on mount.
    // This subscription must continue to work after reconnection.
    const identityUpdates: (typeof identity | null)[] = [];
    const subscription = client2.halo.identity.subscribe((id) => {
      log.info('subscription callback', { id: id?.identityKey?.truncate() });
      identityUpdates.push(id);
    });

    // Wait for initial subscription to fire.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(identityUpdates.length).toBeGreaterThan(0);
    log.info('got initial identity in subscription', { count: identityUpdates.length });

    // Set up reloaded listener before destroying client1.
    const reloaded = new Promise<void>((resolve) => {
      client2.reloaded.on(() => resolve());
    });

    // Destroy client1, triggering reconnection.
    await client1.destroy();
    await reloaded;
    log.info('reloaded event received');

    // Wait for subscriptions to potentially receive updates.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // The critical assertion: Did our existing subscription receive the identity after reconnection?
    // During reconnection, the proxy emits null (close) then should emit identity again (reopen).
    // If the proxy was recreated, the old subscription won't receive the new identity.
    log.info('identity updates after reconnection', {
      totalUpdates: identityUpdates.length,
      updates: identityUpdates.map((id) => id?.identityKey?.truncate() ?? 'null'),
    });

    // The subscription should end with the identity, not null.
    const lastIdentity = identityUpdates[identityUpdates.length - 1];
    expect(lastIdentity).toEqual(identity);

    subscription.unsubscribe();
  });
});
