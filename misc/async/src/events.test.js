//
// Copyright 2020 DXOS.org
//

// dxos-testing-browser

import EventEmitter from 'events';

import { promiseTimeout } from './async';
import { onEvent, waitForEvent } from './events';
import { expectToThrow } from './testing';

test('onEvent', done => {
  const emitter = new EventEmitter();
  const off = onEvent(emitter, 'test', () => {
    off();

    expect(emitter.listenerCount('test')).toBe(0);
    done();
  });

  emitter.emit('test');
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

  await expectToThrow(() => waitForEvent(emitter, 'test', null, 100));
  expect(emitter.listenerCount('test')).toBe(0);
});
