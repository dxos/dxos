//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import WebSocket from 'isomorphic-ws';

import { Trigger, TriggerState } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { createTestWsServer } from './test-utils';

describe('WebSocket', () => {
  test('swap `onclose` handler ', async () => {
    const { endpoint } = await createTestWsServer();
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
