//
// Copyright 2020 DXOS.org
//

// DXOS testing browser.
/* eslint-disable jest/expect-expect, import/order */

import EventEmitter from 'events';

import { expectToThrow } from '@dxos/debug';

import { promiseTimeout } from './async';
import { onEvent, waitForEvent } from './util';
import { latch } from './latch';

test('onEvent', async () => {
  const emitter = new EventEmitter();

  const [promise, resolve] = latch();

  const off = onEvent(emitter, 'test', () => {
    off();

    expect(emitter.listenerCount('test')).toBe(0);
    resolve();
  });

  emitter.emit('test');

  await promise;
});

test('waitForEvent', async () => {
  const emitter = new EventEmitter();
  const waiting = waitForEvent(emitter, 'test');

  setTimeout(() => emitter.emit('test', { value: 500 }), 10);

  const { value } = await waiting;
  expect(value).toBe(500);
  expect(emitter.listenerCount('test')).toBe(0);
});

test('waitForEvent (with test)', async () => {
  const emitter = new EventEmitter();
  const waiting = waitForEvent(emitter, 'test', value => (value === 300) && value);

  setTimeout(() => emitter.emit('test', 100), 10);
  setTimeout(() => emitter.emit('test', 200), 20);
  setTimeout(() => emitter.emit('test', 300), 30);

  const value = await promiseTimeout(waiting, 100);
  expect(value).toBe(300);
  expect(emitter.listenerCount('test')).toBe(0);
});

test('waitForEvent (exipred)', async () => {
  const emitter = new EventEmitter();

  await expectToThrow(() => waitForEvent(emitter, 'test', undefined, 100));
  expect(emitter.listenerCount('test')).toBe(0);
});
