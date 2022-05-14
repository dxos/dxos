//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { OrderedList } from './ordered-list';
import { createTestObjectModel } from './testing';

describe('OrderedList', () => {
  test('update', async () => {
    const { model } = createTestObjectModel();
    const list = new OrderedList(model, 'order');

    {
      await model.set('order', {
        'a': 'b',
        'c': 'd',
        'd': 'e',
        'b': 'c',
        'x': 'a'
      });

      list.update();
      expect(list.values).toEqual(['x', 'a', 'b', 'c', 'd', 'e']);
    }

    {
      // Allow to be disconnected.
      await model.set('order', {
        'a': 'b',
        'x': 'y',
        'b': 'c'
      });

      list.update();
      expect(list.values).toEqual(['a', 'b', 'c', 'x', 'y']);
    }
  });

  test('clear', async () => {
    const { model } = createTestObjectModel();
    await model.set('order', {
      'a': 'b',
      'c': 'd',
      'b': 'c'
    });

    const list = new OrderedList(model, 'order');
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);

    await list.clear();
    expect(list.values).toEqual([]);
  });

  test('set and remove', async () => {
    const { model, debug } = createTestObjectModel();
    const list = new OrderedList(model);
    expect(list.values).toHaveLength(0);

    await list.set(['a', 'b', 'c']);
    expect(list.values).toEqual(['a', 'b', 'c']);
    expect(debug().seq).toBe(1);

    await list.set(['x', 'a']);
    expect(list.values).toEqual(['x', 'a', 'b', 'c']);
    expect(debug().seq).toBe(2);

    await list.set(['b', 'y']);
    expect(list.values).toEqual(['x', 'a', 'b', 'y', 'c']);
    expect(debug().seq).toBe(3);

    await list.remove(['x', 'y']);
    expect(list.values).toEqual(['a', 'b', 'c']);
    expect(debug().seq).toBe(4);
  });
});
