//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';

import type { WorkerCoordinatorMessage } from '../internal/messages';
import { createCoordinatorOnConnect } from './coordinator-worker';

/**
 * Simulated tab connected to a coordinator: sends messages on its own port and records everything
 * the coordinator delivers back. Models one browser tab's SharedWorker port pair.
 */
type Predicate = (message: WorkerCoordinatorMessage) => boolean;

type Tab = {
  send: (message: WorkerCoordinatorMessage) => void;
  received: WorkerCoordinatorMessage[];
  waitFor: (predicate: Predicate) => Promise<WorkerCoordinatorMessage>;
};

const connectTab = (onConnect: (ev: MessageEvent) => void): Tab => {
  const channel = new MessageChannel();
  const received: WorkerCoordinatorMessage[] = [];
  const waiters = new Set<{ predicate: Predicate; trigger: Trigger<WorkerCoordinatorMessage> }>();

  channel.port2.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
    received.push(event.data);
    for (const waiter of waiters) {
      if (waiter.predicate(event.data)) {
        waiter.trigger.wake(event.data);
        waiters.delete(waiter);
      }
    }
  };
  channel.port2.start();

  // Hand the coordinator its side of the channel exactly as a SharedWorker `connect` event would.
  onConnect({ ports: [channel.port1] } as unknown as MessageEvent);

  return {
    // Mirror SharedWorkerCoordinator.sendMessage: `provide-port` carries non-cloneable ports that
    // must be transferred, everything else is a plain structured clone.
    send: (message) =>
      message.type === 'provide-port'
        ? channel.port2.postMessage(message, { transfer: [message.appPort, message.systemPort] })
        : channel.port2.postMessage(message),
    received,
    waitFor: (predicate) => {
      const existing = received.find(predicate);
      if (existing) {
        return Promise.resolve(existing);
      }
      const trigger = new Trigger<WorkerCoordinatorMessage>();
      waiters.add({ predicate, trigger });
      return trigger.wait();
    },
  };
};

const byType =
  (type: WorkerCoordinatorMessage['type']): Predicate =>
  (message) =>
    message.type === type;

describe('coordinator worker routing', () => {
  test('broadcasts new-leader to every connected tab including the sender', async () => {
    const onConnect = createCoordinatorOnConnect();
    const leader = connectTab(onConnect);
    const follower = connectTab(onConnect);

    leader.send({ type: 'new-leader', leaderId: 'leader-1' });

    const [atLeader, atFollower] = await Promise.all([
      leader.waitFor(byType('new-leader')),
      follower.waitFor(byType('new-leader')),
    ]);
    expect(atLeader).toEqual({ type: 'new-leader', leaderId: 'leader-1' });
    expect(atFollower).toEqual({ type: 'new-leader', leaderId: 'leader-1' });
  });

  test('delivers a late-joining follower request-port to the existing leader', async () => {
    // Reproduces the second-tab timing: the leader is already established when the follower joins.
    const onConnect = createCoordinatorOnConnect();
    const leader = connectTab(onConnect);
    leader.send({ type: 'request-port', clientId: 'leader-client' });
    await leader.waitFor((message) => message.type === 'request-port' && message.clientId === 'leader-client');

    // Second tab opens later and asks for a port. The leader must observe this request; otherwise the
    // follower stalls until its port timeout and the app fails to start.
    const follower = connectTab(onConnect);
    follower.send({ type: 'request-port', clientId: 'follower-client' });

    const atLeader = await leader.waitFor(
      (message) => message.type === 'request-port' && message.clientId === 'follower-client',
    );
    expect(atLeader).toEqual({ type: 'request-port', clientId: 'follower-client' });
  });

  test('routes provide-port only to the requesting tab and transfers ports', async () => {
    const onConnect = createCoordinatorOnConnect();
    const leader = connectTab(onConnect);
    const follower = connectTab(onConnect);

    // Follower registers its clientId so the directed reply can find its port.
    follower.send({ type: 'request-port', clientId: 'follower-client' });
    await leader.waitFor((message) => message.type === 'request-port' && message.clientId === 'follower-client');

    const appChannel = new MessageChannel();
    const systemChannel = new MessageChannel();
    leader.send({
      type: 'provide-port',
      clientId: 'follower-client',
      leaderId: 'leader-1',
      appPort: appChannel.port1,
      systemPort: systemChannel.port1,
      livenessLockKey: 'liveness-1',
      isOwner: false,
    });

    const provided = (await follower.waitFor(byType('provide-port'))) as WorkerCoordinatorMessage & {
      type: 'provide-port';
    };
    expect(provided.clientId).toBe('follower-client');
    expect(provided.appPort).toBeInstanceOf(MessagePort);
    expect(provided.systemPort).toBeInstanceOf(MessagePort);

    // The directed reply must not also broadcast to the leader.
    await sleep(20);
    expect(leader.received.some((message) => message.type === 'provide-port')).toBe(false);
  });

  test('isolates tabs when each connect creates a new handler (regression)', async () => {
    const leader = connectTab(createCoordinatorOnConnect());
    const follower = connectTab(createCoordinatorOnConnect());

    leader.send({ type: 'new-leader', leaderId: 'leader-1' });

    await sleep(20);
    expect(follower.received.some((message) => message.type === 'new-leader')).toBe(false);
  });

  test('does not throw when provide-port targets an unknown client', async () => {
    const onConnect = createCoordinatorOnConnect();
    const leader = connectTab(onConnect);
    const appChannel = new MessageChannel();
    const systemChannel = new MessageChannel();

    expect(() =>
      leader.send({
        type: 'provide-port',
        clientId: 'never-requested',
        leaderId: 'leader-1',
        appPort: appChannel.port1,
        systemPort: systemChannel.port1,
        livenessLockKey: 'liveness-1',
        isOwner: false,
      }),
    ).not.toThrow();
    await sleep(20);
  });
});
