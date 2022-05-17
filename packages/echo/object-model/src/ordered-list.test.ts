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

  test('set', async () => {
    const { model, debug } = createTestObjectModel();
    const list = new OrderedList(model);
    expect(list.values).toHaveLength(0);

    // Insert to empty list.
    await list.set(['b']);
    expect(list.values).toEqual(['b']);
    expect(debug.seq).toBe(1);

    // Insert new at begining.
    await list.set(['a', 'b']);
    expect(list.values).toEqual(['a', 'b']);
    expect(debug.seq).toBe(2);

    // Insert new at end.
    await list.set(['b', 'd']);
    expect(list.values).toEqual(['a', 'b', 'd']);
    expect(debug.seq).toBe(3);

    // Insert new in middle.
    await list.set(['b', 'c']);
    expect(list.values).toEqual(['a', 'b', 'c', 'd']);
    expect(debug.seq).toBe(4);

    // Swap existing items with head.
    await list.set(['d', 'a']);
    expect(list.values).toEqual(['d', 'a', 'b', 'c']);
    expect(debug.seq).toBe(5);

    // Swap existing items with tail.
    await list.set(['c', 'b']);
    expect(list.values).toEqual(['d', 'a', 'c', 'b']);
    expect(debug.seq).toBe(6);

    // Swap existing items in middle.
    await list.set(['c', 'a']);
    expect(list.values).toEqual(['d', 'c', 'a', 'b']);
    expect(debug.seq).toBe(7);

    // Swap existing separated items in middle.
    await list.clear();
    await list.set(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(list.values).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(debug.seq).toBe(8);
    await list.set(['e', 'b']);
    expect(list.values).toEqual(['a', 'c', 'd', 'e', 'b', 'f']);
    expect(debug.seq).toBe(9);
  });

  test('remove', async () => {
    const { model, debug } = createTestObjectModel();
    const list = new OrderedList(model);
    expect(list.values).toHaveLength(0);

    await list.set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n']);
    expect(list.values).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n']);
    expect(debug.seq).toBe(1);

    // Remove head
    await list.remove(['a']);
    expect(list.values).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n']);
    expect(debug.seq).toBe(2);

    // Remove tail
    await list.remove(['n']);
    expect(list.values).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
    expect(debug.seq).toBe(3);

    // Remove in middle
    await list.remove(['e']);
    expect(list.values).toEqual(['b', 'c', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
    expect(debug.seq).toBe(4);

    // Remove multiple including head
    await list.remove(['b', 'c', 'd']);
    expect(list.values).toEqual(['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
    expect(debug.seq).toBe(5);

    // Remove multiple including tail
    await list.remove(['k', 'l', 'm']);
    expect(list.values).toEqual(['f', 'g', 'h', 'i', 'j']);
    expect(debug.seq).toBe(6);

    // Remove multiple from middle
    await list.remove(['g', 'h', 'i']);
    expect(list.values).toEqual(['f', 'j']);
    expect(debug.seq).toBe(7);
  });
});
