//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import { EventEmitter } from 'node:events';

import { describe, test } from '@dxos/test';

import { onEvent, waitForEvent } from './event-emitter';
import { latch } from './latch';
import { asyncTimeout } from './timeout';

describe('event-emitter', () => {
  test('onEvent', async () => {
    const emitter = new EventEmitter();

    const [done, resolve] = latch();

    const off = onEvent(emitter, 'test', () => {
      off();

      expect(emitter.listenerCount('test')).to.equal(0);
      resolve();
    });

    emitter.emit('test');

    await done();
  });

  test('waitForEvent', async () => {
    const emitter = new EventEmitter();
    const waiting = waitForEvent(emitter, 'test');

    setTimeout(() => emitter.emit('test', { value: 500 }), 10);

    const { value } = await waiting;
    expect(value).to.equal(500);
    expect(emitter.listenerCount('test')).to.equal(0);
  });

  test('waitForEvent (with test)', async () => {
    const emitter = new EventEmitter();
    const waiting = waitForEvent(emitter, 'test', (value) => value === 300 && value);

    setTimeout(() => emitter.emit('test', 100), 10);
    setTimeout(() => emitter.emit('test', 200), 20);
    setTimeout(() => emitter.emit('test', 300), 30);

    const value = await asyncTimeout(waiting, 100);
    expect(value).to.equal(300);
    expect(emitter.listenerCount('test')).to.equal(0);
  });

  test('waitForEvent (expired)', async () => {
    const emitter = new EventEmitter();

    await expect(() => waitForEvent(emitter, 'test', undefined, 100)).to.throw;
    expect(emitter.listenerCount('test')).to.equal(0);
  });
});
