//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { createStore, createSubscription } from '@dxos/observable-object';
import { describe, test } from '@dxos/test';

describe('Models', () => {
  test('Reactivity', async () => {
    const done = new Trigger();

    const object = createStore({
      id: 'test',
      title: 'Test',
      columns: createStore([
        {
          id: 'column-1',
          title: 'Column 1',
          items: createStore([]),
        },
        {
          id: 'column-2',
          title: 'Column 2',
          items: createStore([]),
        },
      ]),
    });

    expect(object.columns).to.have.length(2);

    // TODO(burdon): Review API.
    const handle = createSubscription(() => {
      if (object.columns.length === 3) {
        done.wake();
      }
    });
    handle.update([object.columns]);

    setTimeout(() => {
      object.columns.push({
        id: 'column-3',
        title: 'Column 3',
        items: [],
      });
    });

    await done.wait();
    handle.unsubscribe();
  });
});
