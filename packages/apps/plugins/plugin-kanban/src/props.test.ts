//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { ObservableArray, ObservableObject, ObservableObjectImpl, subscribe } from '@dxos/observable-object';
import { describe, test } from '@dxos/test';

import { GenericKanbanItem, KanbanColumnModel, KanbanModel } from './props';

describe('Models', () => {
  test('Reactivity', async () => {
    const done = new Trigger();

    // TODO(burdon): Rename base type.
    const object: ObservableObjectImpl<KanbanModel> = new ObservableObject<KanbanModel>({
      id: 'test',
      title: 'Test',
      columns: new ObservableArray<KanbanColumnModel>({
        id: 'column-1',
        title: 'Column 1',
        items: new ObservableArray<GenericKanbanItem>(),
      }),
    });

    // TODO(burdon): IDE cannot understand type inference.
    expect(object.columns).to.have.length(1);

    // TODO(burdon): Triggered twice.
    const unsubscribe = object.columns[subscribe](() => {
      expect(object.columns).to.have.length(2);
      done.wake();
    });

    setTimeout(() => {
      object.columns.push({
        id: 'column-2',
      });
    });

    await done.wait();
    unsubscribe();
  });
});
