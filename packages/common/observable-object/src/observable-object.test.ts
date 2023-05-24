//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { createStore, subscribe } from './observable-object';

describe('createStore', () => {
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
