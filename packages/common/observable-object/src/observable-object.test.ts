//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { createStore, subscribe } from './observable-object';

describe('createStore', () => {
  describe('object', () => {
    test('initial data', () => {
      const store = createStore({ example: 'test' });
      expect(store.example).to.equal('test');
    });

    test('get & set', () => {
      const store = createStore<{ example: string }>();
      store.example = 'test';
      expect(store.example).to.equal('test');
    });

    test('subscribe', async () => {
      const store = createStore<{ example: string }>();
      const trigger = new Trigger();
      (store as any)[subscribe](() => trigger.wake());
      store.example = 'test';
      await trigger.wait();
      expect(store.example).to.equal('test');
    });
  });

  describe('array', () => {
    test('initial data', () => {
      const store = createStore([1, 2, 3]);
      expect(store).to.deep.equal([1, 2, 3]);
    });

    test('push', () => {
      const store = createStore<number[]>([]);
      store.push(1);
      expect(store[0]).to.equal(1);
    });

    test('splice', () => {
      const store = createStore([1, 2, 3]);
      expect(store).to.deep.equal([1, 2, 3]);
      store.splice(0, store.length, ...[4, 5, 6]);
      expect(store).to.deep.equal([4, 5, 6]);
    });

    test('subscribe', async () => {
      const store = createStore<number[]>([]);
      const trigger = new Trigger();
      (store as any)[subscribe](() => trigger.wake());
      store.push(1);
      await trigger.wait();
      expect(store).to.deep.equal([1]);
    });
  });
});
