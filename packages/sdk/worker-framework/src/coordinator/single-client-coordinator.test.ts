//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { SingleClientCoordinator } from './single-client-coordinator';
import type { WorkerCoordinatorMessage } from '../internal/messages';

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

    expect(events).toEqual(['after-send']);

    await Promise.resolve();
    expect(events).toEqual(['after-send', 'received']);
  });
});
