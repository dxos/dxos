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
    const { model, debug } = createTestObjectModel();
    let seq = 0;

    await model.set('order', {
      'a': 'b',
      'c': 'd',
      'b': 'c'
    });
    expect(debug.seq).toBe(++seq);

    const list = new OrderedList(model, 'order');
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);

    await list.init();
    expect(list.values).toEqual([]);
    expect(debug.seq).toBe(++seq);

    await list.init(['a', 'b', 'c']);
    expect(list.values).toEqual(['a', 'b', 'c']);
    expect(debug.seq).toBe(++seq);
  });

  test('set and remove', async () => {
    const { model, debug } = createTestObjectModel();
    let seq = 0;

    const list = new OrderedList(model);
    expect(list.values).toHaveLength(0);

    // Init.
    await list.init(['a', 'b', 'c', 'd']);
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);
    expect(debug.seq).toBe(++seq);

    // Swap.
    await list.insert('a', 'c');
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);
    expect(debug.seq).toBe(++seq);

    await list.insert('a', 'c');
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);
    expect(debug.seq).toBe(seq);

    // Insert start.
    await list.insert('x', 'a');
    expect(list.values).toEqual(['x', 'a', 'c', 'b', 'd']);
    expect(debug.seq).toBe(++seq);

    // Insert end.
    await list.insert('d', 'y');
    expect(list.values).toEqual(['x', 'a', 'c', 'b', 'd', 'y']);
    expect(debug.seq).toBe(++seq);

    // Insert in middle.
    await list.insert('z', 'c');
    expect(list.values).toEqual(['x', 'a', 'z', 'c', 'b', 'd', 'y']);
    expect(debug.seq).toBe(++seq);

    // Remove
    await list.remove(['x', 'y', 'z']);
    expect(list.values).toEqual(['a', 'c', 'b', 'd']);
    expect(debug.seq).toBe(++seq);
  });
});
