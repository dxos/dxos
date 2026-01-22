//
// Copyright 2024 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { RootSettingsStore, SettingsStore } from './store';
import { createLocalStorageMock } from './testing';

enum TestEnum {
  INACTIVE = 0,
  ACTIVE = 1,
}

const TestSchema = Schema.mutable(
  Schema.Struct({
    activePreset: Schema.optional(Schema.Boolean),
    num: Schema.optional(Schema.Number),
    nums: Schema.mutable(Schema.Array(Schema.Number)),
    name: Schema.optional(Schema.String),
    services: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          url: Schema.String,
        }),
      ),
    ),
    status: Schema.optional(Schema.Enums(TestEnum)),
    literals: Schema.optional(Schema.Literal('inactive', 'active')),
  }),
);

export interface TestType extends Schema.Schema.Type<typeof TestSchema> {}

describe('ObjectStore', () => {
  test('basic', () => {
    const mock = createLocalStorageMock();
    const registry = Registry.make();

    const atom = Atom.make<TestType>({ nums: [], services: [] });
    const store = new SettingsStore(registry, TestSchema, 'dxos.org/setting', atom, mock);

    // Update the atom value.
    registry.set(atom, { ...registry.get(atom), num: 42 });
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
    const registry = Registry.make();

    {
      const atom = Atom.make<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(registry, TestSchema, 'dxos.org/setting', atom, mock);
      expect(store.value.activePreset).to.be.undefined;

      registry.set(atom, { ...registry.get(atom), activePreset: true });
      expect(store.value.activePreset).to.be.true;

      registry.set(atom, { ...registry.get(atom), activePreset: false });
      expect(store.value.activePreset).to.be.false;

      registry.set(atom, {
        ...registry.get(atom),
        num: 42,
        nums: [1, 2],
        name: 'foobar',
        services: [{ url: 'example.com/foo' }, { url: 'example.com/bar' }],
        status: TestEnum.ACTIVE,
        literals: 'active',
      });
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/active-preset': 'false',
      'dxos.org/setting/literals': 'active',
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,2]',
      'dxos.org/setting/name': 'foobar',
      'dxos.org/setting/services': '[{"url":"example.com/foo"},{"url":"example.com/bar"}]',
      'dxos.org/setting/status': '1',
    });

    {
      const atom = Atom.make<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(registry, TestSchema, 'dxos.org/setting', atom, mock);

      expect(store.value.activePreset).to.be.false;
      expect(store.value.num).to.eq(42);
      expect(store.value.nums).to.deep.eq([1, 2]);
      expect(store.value.name).to.eq('foobar');
      expect(store.value.services).to.deep.eq([{ url: 'example.com/foo' }, { url: 'example.com/bar' }]);
      expect(store.value.status).to.deep.eq(TestEnum.ACTIVE);
      expect(store.value.literals).to.eq('active');

      registry.set(atom, {
        ...registry.get(atom),
        activePreset: undefined,
        nums: [1, 3],
        name: undefined,
        services: [{ url: 'example.com/bar' }],
        status: TestEnum.INACTIVE,
        literals: 'inactive',
      });
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,3]',
      'dxos.org/setting/services': '[{"url":"example.com/bar"}]',
      'dxos.org/setting/status': '0',
      'dxos.org/setting/literals': 'inactive',
    });

    {
      const atom = Atom.make<TestType>({ nums: [], services: [] });
      const store = new SettingsStore(registry, TestSchema, 'dxos.org/setting', atom, mock);

      expect(store.value.activePreset).to.be.undefined;
      expect(store.value.num).to.eq(42);
      expect(store.value.nums).to.deep.eq([1, 3]);
      expect(store.value.name).to.be.undefined;
      expect(store.value.services).to.deep.eq([{ url: 'example.com/bar' }]);
      expect(store.value.status).to.deep.eq(TestEnum.INACTIVE);
      expect(store.value.literals).to.eq('inactive');

      store.reset();
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/nums': '[]',
      'dxos.org/setting/services': '[]',
    });
  });

  test('root', () => {
    const mock = createLocalStorageMock();
    const registry = Registry.make();
    const root = new RootSettingsStore(registry, mock);

    const atom1 = Atom.make<TestType>({ nums: [], services: [] });
    const atom2 = Atom.make<TestType>({ nums: [], services: [] });

    const store1 = root.createStore({ schema: TestSchema, prefix: 'dxos.org/foo', atom: atom1 });
    const store2 = root.createStore({ schema: TestSchema, prefix: 'dxos.org/bar', atom: atom2 });

    expect(mock.store).to.deep.eq({
      'dxos.org/foo/services': '[]',
      'dxos.org/foo/nums': '[]',
      'dxos.org/bar/services': '[]',
      'dxos.org/bar/nums': '[]',
    });

    registry.set(atom1, { ...registry.get(atom1), name: 'foo' });
    registry.set(atom2, { ...registry.get(atom2), name: 'bar' });

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
