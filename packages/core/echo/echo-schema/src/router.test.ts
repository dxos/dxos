//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?
import waitForExpect from 'wait-for-expect';

import { describe, test } from '@dxos/test';

import { DatabaseRouter } from './router';
import { createDatabase } from './testing';
import { TypedObject } from './typed-object';

describe('Router', () => {
  test('updates are propagated', async () => {
    const router = new DatabaseRouter();
    const db = await createDatabase(router);

    const task = new TypedObject();
    db.add(task);
    await db.flush();

    let counter = 0;
    const selection = router.createSubscription(() => {
      counter++;
    });
    selection.update([task]);

    task.title = 'Test title';
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(1));

    task.assignee = new TypedObject({ name: 'user-1' });
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(2));

    task.assignee.name = 'user-2';
    selection.update([task, task.assignee]);

    task.assignee.name = 'user-3';
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(3));
  });

  test('updates are synchronous', async () => {
    const router = new DatabaseRouter();
    const db = await createDatabase(router);

    const task = new TypedObject();
    db.add(task);
    await db.flush();

    const actions: string[] = [];
    const selection = router.createSubscription(() => {
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
