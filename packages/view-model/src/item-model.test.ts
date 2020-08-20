//
// Copyright 2020 DXOS.org
//

import { ItemModel } from './item-model';

describe('item model', () => {
  test('create multiple items', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo'
      },
      {
        __type_url: 'testing.Item',
        itemId: '2'
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        displayName: 'foo',
        deleted: false,
        metadata: {}
      },
      {
        type: 'testing.Item',
        itemId: '2',
        displayName: '2',
        deleted: false,
        metadata: {}
      }
    ]);
    expect(model.getAllDeletedItems()).toStrictEqual([]);
  });

  test('rename item', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo'
      },
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'bar'
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        displayName: 'bar',
        deleted: false,
        metadata: {}
      }
    ]);
    expect(model.getAllDeletedItems()).toStrictEqual([]);
  });

  test('update item metdata', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo',
        metadata: { foo: 'bar' }
      },
      {
        __type_url: 'testing.Item',
        itemId: '1',
        metadata: { foo: 'foo' }
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        displayName: 'foo',
        deleted: false,
        metadata: { foo: 'foo' }
      }
    ]);
    expect(model.getAllDeletedItems()).toStrictEqual([]);
  });

  test('delete item', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo'
      },
      {
        __type_url: 'testing.Item',
        itemId: '1',
        deleted: true
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([]);
    expect(model.getAllDeletedItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        deleted: true,
        displayName: 'foo',
        metadata: {}
      }
    ]);
  });

  test('restore item', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo'
      },
      {
        __type_url: 'testing.Item',
        itemId: '1',
        deleted: true
      },
      {
        __type_url: 'testing.Item',
        itemId: '1',
        deleted: false
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        deleted: false,
        displayName: 'foo',
        metadata: {}
      }
    ]);
    expect(model.getAllDeletedItems()).toStrictEqual([]);
  });

  test('can start a message in deleted state', () => {
    const model = new ItemModel();
    model.onUpdate([
      {
        __type_url: 'testing.Item',
        itemId: '1',
        displayName: 'foo',
        deleted: true
      }
    ]);

    expect(model.getAllItems()).toStrictEqual([]);
    expect(model.getAllDeletedItems()).toStrictEqual([
      {
        type: 'testing.Item',
        itemId: '1',
        deleted: true,
        displayName: 'foo',
        metadata: {}
      }
    ]);
  });
});
