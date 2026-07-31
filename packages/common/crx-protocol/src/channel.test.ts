//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createLoopback } from './index';

describe('createLoopback', () => {
  test('delivers a message from one end to the other', async ({ expect }) => {
    const [a, b] = createLoopback();
    const received: unknown[] = [];
    b.subscribe((message) => received.push(message));
    a.send({ hello: 'world' });
    await Promise.resolve();
    expect(received).toEqual([{ hello: 'world' }]);
  });

  test('unsubscribe stops delivery', async ({ expect }) => {
    const [a, b] = createLoopback();
    const received: unknown[] = [];
    const off = b.subscribe((message) => received.push(message));
    off();
    a.send({ x: 1 });
    await Promise.resolve();
    expect(received).toEqual([]);
  });
});
