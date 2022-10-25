//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { ModelFactory, TestRig } from '@dxos/model-factory';

import { ObjectModel } from './object-model';
import { OrderedList } from './ordered-list';

describe('OrderedList', function () {
  it('refresh', async function () {
    const rig = new TestRig(
      new ModelFactory().registerModel(ObjectModel),
      ObjectModel
    );
    const { model } = rig.createPeer();

    const list = new OrderedList(model, 'order');

    {
      await model.set('order', {
        a: 'b',
        c: 'd',
        d: 'e',
        b: 'c',
        x: 'a'
      });

      list.refresh();
      expect(list.values).toEqual(['x', 'a', 'b', 'c', 'd', 'e']);
    }

    {
      // Allow to be disconnected.
      await model.set('order', {
        a: 'b',
        x: 'y',
        b: 'c'
      });

      list.refresh();
      expect(list.values).toEqual(['a', 'b', 'c', 'x', 'y']);
    }
  });

  it('clear', async function () {
    const rig = new TestRig(
      new ModelFactory().registerModel(ObjectModel),
      ObjectModel
    );
    const { model } = rig.createPeer();

    await model.set('order', {
      a: 'b',
      c: 'd',
      b: 'c'
    });

    const list = new OrderedList(model, 'order');
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);

    await list.init();
    expect(list.values).toEqual([]);

    await list.init(['a', 'b', 'c']);
    expect(list.values).toEqual(['a', 'b', 'c']);
  });

  it('set and remove', async function () {
    const rig = new TestRig(
      new ModelFactory().registerModel(ObjectModel),
      ObjectModel
    );
    const { model } = rig.createPeer();

    const list = new OrderedList(model);
    expect(list.values).toHaveLength(0);

    // Init.
    await list.init(['a', 'b', 'c', 'd']);
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);

    // Swap.
    await list.insert('a', 'c');
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);

    await list.insert('a', 'c');
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);

    // Insert start.
    await list.insert('x', 'a');
    expect(list.values).toEqual(['x', 'a', 'c', 'b', 'd']);

    // Insert end.
    await list.insert('d', 'y');
    expect(list.values).toEqual(['x', 'a', 'c', 'b', 'd', 'y']);

    // Insert in middle.
    await list.insert('z', 'c');
    expect(list.values).toEqual(['x', 'a', 'z', 'c', 'b', 'd', 'y']);

    // Remove
    await list.remove(['x', 'y', 'z']);
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);
  });
});
