//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { createSubscription } from './subscription';
import { Expando } from './typed-object';
import { createDatabase } from '../testing';

describe('create subscription', () => {
  test('updates are propagated', async () => {
    const { db } = await createDatabase();
    const task = new Expando();
    db.add(task);

    let counter = 0;
    const selection = createSubscription(() => {
      counter++;
    });
    selection.update([task]);

    task.title = 'Test title';
    expect(counter).to.equal(2);

    task.title = 'Test title revision';
    expect(counter).to.equal(3);
  });

  test('updates are synchronous', async () => {
    const { db } = await createDatabase();
    const task = new Expando();
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

  test('latest value is available in subscription', async () => {
    const { db } = await createDatabase();
    const task = new Expando();
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
});
