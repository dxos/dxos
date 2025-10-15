//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { Obj, Type } from '@dxos/echo';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';

import { EchoTestBuilder } from '../testing';

import { createSubscription } from './subscription';

describe('create subscription', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('updates are propagated', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, {});
    db.add(task);

    const counter = createUpdateCounter(task);

    task.title = 'Test title';
    expect(counter.value).to.equal(2);

    task.title = 'Test title revision';
    expect(counter.value).to.equal(3);
  });

  test('updates are synchronous', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, {});
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
    registerSignalsRuntime();

    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, {});
    db.add(task);

    const actions: string[] = [];
    const clearEffect = effect(() => {
      log('effect', { title: task.title });
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
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, {});
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
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, { nested: { title: 'Test title' } });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.nested.title = 'New title';
    expect(counter.value).to.equal(2);
  });

  test('updates for deep nested objects', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, {
      nested: { deep_nested: { title: 'Test title' } },
    });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.nested.deep_nested.title = 'New title';
    expect(counter.value).to.equal(2);
  });

  test('updates for array objects', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, { array: ['Test value'] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.array[0] = 'New value';
    expect(counter.value).to.equal(2);
  });

  test('updates for automerge array object fields', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(Type.Expando, { array: [{ title: 'Test value' }] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.array[0].title = 'New value';
    expect(counter.value).to.equal(2);
  });

  test('updates for nested automerge array object fields', async () => {
    const { db } = await builder.createDatabase();
    const nestedArrayHolder = { nested_array: [{ title: 'Test value' }] };
    const task = Obj.make(Type.Expando, { array: [nestedArrayHolder] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    task.array[0].nested_array[0].title = 'New value';
    expect(counter.value).to.equal(2);
  });
});

const createUpdateCounter = (object: any) => {
  const counter = { value: 0 };
  const selection = createSubscription(() => {
    counter.value++;
  });
  selection.update([object]);
  return counter;
};
