import { ViewModel } from './view-model';

test('create multiple views', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo'
    },
    {
      __type_url: 'testing.View',
      viewId: '2'
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      displayName: 'foo',
      deleted: false,
      metadata: {}
    },
    {
      type: 'testing.View',
      viewId: '2',
      displayName: '2',
      deleted: false,
      metadata: {}
    }
  ]);
  expect(model.getAllDeletedViews()).toStrictEqual([]);
});

test('rename view', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo'
    },
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'bar'
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      displayName: 'bar',
      deleted: false,
      metadata: {}
    }
  ]);
  expect(model.getAllDeletedViews()).toStrictEqual([]);
});

test('update view metdata', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo',
      metadata: { foo: 'bar' }
    },
    {
      __type_url: 'testing.View',
      viewId: '1',
      metadata: { foo: 'foo' }
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      displayName: 'foo',
      deleted: false,
      metadata: { foo: 'foo' }
    }
  ]);
  expect(model.getAllDeletedViews()).toStrictEqual([]);
});

test('delete view', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo'
    },
    {
      __type_url: 'testing.View',
      viewId: '1',
      deleted: true
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([]);
  expect(model.getAllDeletedViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      deleted: true,
      displayName: 'foo',
      metadata: {}
    }
  ]);
});

test('restore view', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo'
    },
    {
      __type_url: 'testing.View',
      viewId: '1',
      deleted: true
    },
    {
      __type_url: 'testing.View',
      viewId: '1',
      deleted: false
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      deleted: false,
      displayName: 'foo',
      metadata: {}
    }
  ]);
  expect(model.getAllDeletedViews()).toStrictEqual([]);
});

test('can start a message in deleted state', () => {
  const model = new ViewModel();
  model.onUpdate([
    {
      __type_url: 'testing.View',
      viewId: '1',
      displayName: 'foo',
      deleted: true
    }
  ]);

  expect(model.getAllViews()).toStrictEqual([]);
  expect(model.getAllDeletedViews()).toStrictEqual([
    {
      type: 'testing.View',
      viewId: '1',
      deleted: true,
      displayName: 'foo',
      metadata: {}
    }
  ]);
});
