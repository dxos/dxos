//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?

import { Trigger } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { createSubscription } from './access-observer';
import { createStore } from './observable-object';

describe('access observer', () => {
  test('updates are propagated', async () => {
    const task = createStore<{ title: string }>();

    let counter = 0;
    const selection = createSubscription(() => {
      counter++;
    });
    selection.update([task]);

    task.title = 'Test title';
    expect(counter).toEqual(2);

    task.title = 'Test title revision';
    expect(counter).toEqual(3);
  });

  test('updates are synchronous', async () => {
    const task = createStore<{ title: string }>();

    const actions: string[] = [];
    const selection = createSubscription(() => {
      actions.push('update');
    });
    selection.update([task]);
    // Initial update caused by changed selection.
    expect(actions).toEqual(['update']);

    actions.push('before');
    task.title = 'Test title';
    actions.push('after');

    // NOTE: This order is required for input components in react to function properly when directly bound to ECHO objects.
    expect(actions).toEqual(['update', 'before', 'update', 'after']);
  });

  test('latest value is available in subscription', async () => {
    const task = createStore<{ title: string }>();

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
    expect(await title.wait()).toEqual('Test title');
  });

  test('accepts arbitrary selection', async () => {
    const selection = createSubscription(() => {});
    selection.update(['example', null, -1]);
  });
});
