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
});

test('update view metdata', () => {
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
});
