//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { SingleClientCoordinator } from './single-client-coordinator';
import type { WorkerCoordinatorMessage } from './types';

describe('SingleClientCoordinator', () => {
  test('echoes messages back to sender', async ({ expect }) => {
    const coordinator = new SingleClientCoordinator();
    const received = new Trigger<WorkerCoordinatorMessage>();

    coordinator.onMessage.on((msg) => {
      received.wake(msg);
    });

    const message: WorkerCoordinatorMessage = {
      type: 'new-leader',
      leaderId: 'test-leader',
    };
    coordinator.sendMessage(message);

    const result = await received.wait();
    expect(result).toEqual(message);
  });

  test('echoes request-port messages', async ({ expect }) => {
    const coordinator = new SingleClientCoordinator();
    const received = new Trigger<WorkerCoordinatorMessage>();

    coordinator.onMessage.on((msg) => {
      received.wake(msg);
    });

    const message: WorkerCoordinatorMessage = {
      type: 'request-port',
      clientId: 'test-client-123',
    };
    coordinator.sendMessage(message);

    const result = await received.wait();
    expect(result).toEqual(message);
  });

  test('messages are delivered asynchronously via microtask', async ({ expect }) => {
    const coordinator = new SingleClientCoordinator();
    const events: string[] = [];

    coordinator.onMessage.on(() => {
      events.push('received');
    });

    coordinator.sendMessage({ type: 'new-leader', leaderId: 'test' });
    events.push('after-send');

    // Message should not be received yet (queued in microtask).
    expect(events).toEqual(['after-send']);

    // Wait for microtask to execute.
    await Promise.resolve();
    expect(events).toEqual(['after-send', 'received']);
  });

  test('handles multiple messages in sequence', async ({ expect }) => {
    const coordinator = new SingleClientCoordinator();
    const messages: WorkerCoordinatorMessage[] = [];

    coordinator.onMessage.on((msg) => {
      messages.push(msg);
    });

    coordinator.sendMessage({ type: 'new-leader', leaderId: 'leader-1' });
    coordinator.sendMessage({ type: 'request-port', clientId: 'client-1' });
    coordinator.sendMessage({ type: 'new-leader', leaderId: 'leader-2' });

    // Wait for all microtasks.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ type: 'new-leader', leaderId: 'leader-1' });
    expect(messages[1]).toEqual({ type: 'request-port', clientId: 'client-1' });
    expect(messages[2]).toEqual({ type: 'new-leader', leaderId: 'leader-2' });
  });

  test('multiple subscribers receive same message', async ({ expect }) => {
    const coordinator = new SingleClientCoordinator();
    const received1 = new Trigger<WorkerCoordinatorMessage>();
    const received2 = new Trigger<WorkerCoordinatorMessage>();

    coordinator.onMessage.on((msg) => {
      received1.wake(msg);
    });
    coordinator.onMessage.on((msg) => {
      received2.wake(msg);
    });

    const message: WorkerCoordinatorMessage = {
      type: 'new-leader',
      leaderId: 'test-leader',
    };
    coordinator.sendMessage(message);

    const [result1, result2] = await Promise.all([received1.wait(), received2.wait()]);
    expect(result1).toEqual(message);
    expect(result2).toEqual(message);
  });
});
