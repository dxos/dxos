//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, TriggerState } from '@dxos/async';

import { createTestEdgeWsServer } from './testing';

describe('WebSocket', () => {
  test('swap `onclose` handler ', async () => {
    const { endpoint, cleanup } = await createTestEdgeWsServer(8003);
    onTestFinished(cleanup);

    const ws = new WebSocket(endpoint);
    const opened = new Trigger();
    ws.onopen = () => {
      opened.wake();
    };
    const closeCalled1 = new Trigger();
    ws.onclose = () => {
      closeCalled1.wake();
    };
    const closeCalled2 = new Trigger();
    ws.onclose = () => {
      closeCalled2.wake();
    };

    await opened.wait();
    ws.close();
    await closeCalled2.wait();
    expect(closeCalled1.state === TriggerState.WAITING).is.true;
  });
});
