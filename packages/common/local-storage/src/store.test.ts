//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S, create } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { RootSettingsStore, SettingsStore } from './store';
import { createLocalStorageMock } from './testing';

enum TestEnum {
  INACTIVE = 0,
  ACTIVE = 1,
}

const TestSchema = S.mutable(
  S.Struct({
    activePreset: S.optional(S.Boolean),
    num: S.optional(S.Number),
    nums: S.mutable(S.Array(S.Number)),
    name: S.optional(S.String),
    services: S.mutable(
      S.Array(
        S.Struct({
          url: S.String,
        }),
      ),
    ),
    status: S.optional(S.Enums(TestEnum)),
  }),
);

export interface TestType extends S.Schema.Type<typeof TestSchema> {}

describe('ObjectStore', () => {
  registerSignalsRuntime();

  test('basic', () => {
    const mock = createLocalStorageMock();

    const value = create<TestType>({ nums: [], services: [] });
    const store = new SettingsStore(TestSchema, 'dxos.org/setting', value, mock);
    store.value.num = 42;
    expect(mock.store).to.deep.eq({
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[]',
      'dxos.org/setting/services': '[]',
    });

    store.reset();
    expect(mock.store).to.deep.eq({
      'dxos.org/setting/nums': '[]',
      'dxos.org/setting/services': '[]',
    });
  });

  test('full', () => {
    const mock = createLocalStorageMock();

    {
      const value = create<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(TestSchema, 'dxos.org/setting', value, mock);
      expect(store.value.activePreset).to.be.undefined;

      store.value.activePreset = true;
      expect(store.value.activePreset).to.be.true;

      store.value.activePreset = false;
      expect(store.value.activePreset).to.be.false;

      store.value.num = 42;
      store.value.nums.push(1);
      store.value.nums.push(2);

      store.value.name = 'foobar';
      store.value.services.push({ url: 'example.com/foo' });
      store.value.services.push({ url: 'example.com/bar' });

      store.value.status = TestEnum.ACTIVE;
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/active-preset': 'false',
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,2]',
      'dxos.org/setting/name': 'foobar',
      'dxos.org/setting/services': '[{"url":"example.com/foo"},{"url":"example.com/bar"}]',
      'dxos.org/setting/status': '1',
    });

    {
      const value = create<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(TestSchema, 'dxos.org/setting', value, mock);

      expect(store.value.activePreset).to.be.false;
      expect(store.value.num).to.eq(42);
      expect(store.value.nums).to.deep.eq([1, 2]);
      expect(store.value.name).to.eq('foobar');
      expect(store.value.services).to.deep.eq([{ url: 'example.com/foo' }, { url: 'example.com/bar' }]);
      expect(store.value.status).to.deep.eq(TestEnum.ACTIVE);

      store.value.activePreset = undefined;
      store.value.nums.splice(1, 1, 3);
      store.value.name = undefined;
      store.value.services.splice(0, 1);
      store.value.status = TestEnum.INACTIVE;
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,3]',
      'dxos.org/setting/services': '[{"url":"example.com/bar"}]',
      'dxos.org/setting/status': '0',
    });

    {
      const value = create<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(TestSchema, 'dxos.org/setting', value, mock);

      expect(store.value.activePreset).to.be.undefined;
      expect(store.value.num).to.eq(42);
      expect(store.value.nums).to.deep.eq([1, 3]);
      expect(store.value.name).to.be.undefined;
      expect(store.value.services).to.deep.eq([{ url: 'example.com/bar' }]);
      expect(store.value.status).to.deep.eq(TestEnum.INACTIVE);

      store.reset();
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/nums': '[]',
      'dxos.org/setting/services': '[]',
    });
  });

  test('root', () => {
    const mock = createLocalStorageMock();
    const root = new RootSettingsStore(mock);

    const store1 = root.createStore({ schema: TestSchema, prefix: 'dxos.org/foo', value: { nums: [], services: [] } });
    const store2 = root.createStore({ schema: TestSchema, prefix: 'dxos.org/bar', value: { nums: [], services: [] } });

    expect(mock.store).to.deep.eq({
      'dxos.org/foo/services': '[]',
      'dxos.org/foo/nums': '[]',
      'dxos.org/bar/services': '[]',
      'dxos.org/bar/nums': '[]',
    });

    store1.value.name = 'foo';
    store2.value.name = 'bar';

    expect(root.toJSON()).to.deep.eq({
      'dxos.org/foo': { name: 'foo', services: [], nums: [] },
      'dxos.org/bar': { name: 'bar', services: [], nums: [] },
    });

    expect(mock.store).to.deep.eq({
      'dxos.org/foo/name': 'foo',
      'dxos.org/foo/services': '[]',
      'dxos.org/foo/nums': '[]',
      'dxos.org/bar/name': 'bar',
      'dxos.org/bar/services': '[]',
      'dxos.org/bar/nums': '[]',
    });

    store2.reset();

    expect(mock.store).to.deep.eq({
      'dxos.org/foo/name': 'foo',
      'dxos.org/foo/services': '[]',
      'dxos.org/foo/nums': '[]',
      'dxos.org/bar/services': '[]',
      'dxos.org/bar/nums': '[]',
    });

    root.reset();

    expect(mock.store).to.deep.eq({
      'dxos.org/foo/services': '[]',
      'dxos.org/foo/nums': '[]',
      'dxos.org/bar/services': '[]',
      'dxos.org/bar/nums': '[]',
    });

    root.destroy();

    expect(root.toJSON()).to.deep.eq({});
  });
});
