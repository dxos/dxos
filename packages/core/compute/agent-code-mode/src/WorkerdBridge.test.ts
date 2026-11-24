//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as WorkerdBridge from './WorkerdBridge.ts';

const received = (port: WorkerdBridge.Port) => {
  const messages: unknown[] = [];
  port.addEventListener('message', (event) => messages.push((event as MessageEvent).data));
  return messages;
};

describe('WorkerdBridge.Port', () => {
  test('holds what arrives before start, as a MessagePort does', ({ expect }) => {
    const port = new WorkerdBridge.Port(async () => {});
    // The host's greeting can arrive before the isolate's RPC client listens.
    port.receive([0]);
    const messages = received(port);
    expect(messages).toEqual([]);

    port.start();
    expect(messages).toEqual([0]);

    port.receive([1, 2]);
    expect(messages).toEqual([0, 1, 2]);
  });

  test('start delivers held messages once', ({ expect }) => {
    const port = new WorkerdBridge.Port(async () => {});
    port.receive(['greeting']);
    const messages = received(port);
    port.start();
    port.start();
    expect(messages).toEqual(['greeting']);
  });
});
