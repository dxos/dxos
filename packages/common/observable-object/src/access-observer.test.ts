//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?
import waitForExpect from 'wait-for-expect';

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
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(1));

    task.title = 'Test title revision';
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(2));
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
});
