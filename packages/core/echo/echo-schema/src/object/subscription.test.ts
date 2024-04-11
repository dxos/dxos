//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { Trigger, sleep } from '@dxos/async';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { createSubscription } from './subscription';
import * as E from '../effect/reactive';
import { type Expando, type ReactiveObject } from '../effect/reactive';
import { createDatabase } from '../testing';

describe('create subscription', () => {
  test('updates are propagated', async () => {
    const { db } = await createDatabase();
    const task = createExpando();
    db.add(task);

    const counter = createUpdateCounter(task);

    task.title = 'Test title';
    expect(counter.value).to.equal(2);

    task.title = 'Test title revision';
    expect(counter.value).to.equal(3);
  });

  test('updates are synchronous', async () => {
    const { db } = await createDatabase();
    const task = createExpando();
    db.add(task);

    const actions: string[] = [];
    const selection = createSubscription(() => {
      actions.push('update');
    });
    selection.update([task]);
    // Initial update caused by changed selection.
    expect(actions).to.deep.equal(['update']);

    actions.push('before');
    task.title = 'Test title';
    actions.push('after');

    // NOTE: This order is required for input components in react to function properly when directly bound to ECHO objects.
    expect(actions).to.deep.equal(['update', 'before', 'update', 'after']);
  });

  test('signal updates are synchronous', async () => {
    registerSignalRuntime();

    const { db } = await createDatabase();
    const task = createExpando();
    db.add(task);

    const actions: string[] = [];
    const clearEffect = effect(() => {
      log.info('effect', { title: task.title });
      actions.push('update');
    });
    // Initial update caused by changed selection.
    expect(actions).to.deep.equal(['update']);

    actions.push('before');
    task.title = 'Test title';
    actions.push('after');

    await sleep(10);

    clearEffect();
    // NOTE: This order is required for input components in react to function properly when directly bound to ECHO objects.
    expect(actions).to.deep.equal(['update', 'before', 'update', 'after']);
  });

  test('latest value is available in subscription', async () => {
    const { db } = await createDatabase();
    const task = createExpando();
    db.add(task);

    let counter = 0;
    const title = new Trigger<string>();
    const selection = createSubscription(() => {
      if (counter === 1) {
        title.wake(task.title);
      }
      counter++;
    });
    selection.update([task]);

    task.title = 'Test title';
    expect(await title.wait()).to.equal('Test title');
  });

  test('accepts arbitrary selection', async () => {
    const selection = createSubscription(() => {});
    selection.update(['example', null, -1]);
  });

  test('updates for nested objects', async () => {
    const { db } = await createDatabase();
    const task = createExpando({ nested: { title: 'Test title' } });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.nested.title = 'New title';
    expect(counter.value).to.equal(2);
  });

  test('updates for deep nested objects', async () => {
    const { db } = await createDatabase();
    const task = createExpando({
      nested: { deep_nested: { title: 'Test title' } },
    });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.nested.deep_nested.title = 'New title';
    expect(counter.value).to.equal(2);
  });

  test('updates for array objects', async () => {
    const { db } = await createDatabase();
    const task = createExpando({ array: ['Test value'] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.array[0] = 'New value';
    expect(counter.value).to.equal(2);
  });
});

test('updates for automerge array object fields', async () => {
  const { db } = await createDatabase();
  const task = createExpando({ array: [{ title: 'Test value' }] });
  db.add(task);

  const counter = createUpdateCounter(task);

  expect(counter.value).to.equal(1);
  task.array[0].title = 'New value';
  expect(counter.value).to.equal(2);
});

test('updates for nested automerge array object fields', async () => {
  const { db } = await createDatabase();
  const nestedArrayHolder = { nested_array: [{ title: 'Test value' }] };
  const task = createExpando({ array: [nestedArrayHolder] });
  db.add(task);

  const counter = createUpdateCounter(task);

  expect(counter.value).to.equal(1);
  task.array[0].nested_array[0].title = 'New value';
  expect(counter.value).to.equal(2);
});

const createUpdateCounter = (object: any) => {
  const counter = { value: 0 };
  const selection = createSubscription(() => {
    counter.value++;
  });
  selection.update([object]);
  return counter;
};

const createExpando = <T extends Record<string, any>>(props: T = {} as T): ReactiveObject<Expando> => {
  return E.object(E.Expando, props);
};
