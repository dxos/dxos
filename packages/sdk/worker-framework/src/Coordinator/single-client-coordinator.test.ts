//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import * as WorkerProtocol from '../WorkerProtocol';
import { SingleClient } from './single-client-coordinator';

describe('SingleClient coordinator', () => {
  test('echoes messages back to sender', async ({ expect }) => {
    const coordinator = new SingleClient();
    const received = new Trigger<WorkerProtocol.CoordinatorMessage>();

    coordinator.onMessage.on((msg) => {
      received.wake(msg);
    });

    const message: WorkerProtocol.CoordinatorMessage = {
      type: 'new-leader',
      leaderId: 'test-leader',
    };
    coordinator.sendMessage(message);

    const result = await received.wait();
    expect(result).toEqual(message);
  });

  test('echoes request-port messages', async ({ expect }) => {
    const coordinator = new SingleClient();
    const received = new Trigger<WorkerProtocol.CoordinatorMessage>();

    coordinator.onMessage.on((msg) => {
      received.wake(msg);
    });

    const message: WorkerProtocol.CoordinatorMessage = {
      type: 'request-port',
      clientId: 'test-client-123',
    };
    coordinator.sendMessage(message);

    const result = await received.wait();
    expect(result).toEqual(message);
  });

  test('messages are delivered asynchronously via microtask', async ({ expect }) => {
    const coordinator = new SingleClient();
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
