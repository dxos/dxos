//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { ObjectStore } from './store';

class MockStorage implements Storage {
  store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

const mock = new MockStorage();

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
    names: S.mutable(S.Array(S.String)),
    status: S.optional(S.Enums(TestEnum)),
  }),
);

export interface TestType extends S.Schema.Type<typeof TestSchema> {}

const defaultValue: TestType = { nums: [], names: [] };

describe('ObjectStore', () => {
  registerSignalsRuntime();

  test('init', () => {
    {
      const store = new ObjectStore<TestType>(TestSchema, 'dxos.org/setting', defaultValue, mock);
      expect(store.value.activePreset).to.be.undefined;

      store.value.activePreset = true;
      expect(store.value.activePreset).to.be.true;

      store.value.activePreset = false;
      expect(store.value.activePreset).to.be.false;

      store.value.num = 42;
      store.value.nums.push(1);
      store.value.nums.push(2);

      store.value.name = 'foobar';
      store.value.names.push('foo');
      store.value.names.push('bar');

      store.value.status = TestEnum.ACTIVE;
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/active-preset': 'false',
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,2]',
      'dxos.org/setting/name': 'foobar',
      'dxos.org/setting/names': '["foo","bar"]',
      'dxos.org/setting/status': '1',
    });

    {
      const store = new ObjectStore<TestType>(TestSchema, 'dxos.org/setting', defaultValue, mock);

      expect(store.value.activePreset).to.be.false;
      expect(store.value.num).to.eq(42);
      expect(store.value.nums).to.deep.eq([1, 2]);
      expect(store.value.name).to.eq('foobar');
      expect(store.value.names).to.deep.eq(['foo', 'bar']);
      expect(store.value.status).to.deep.eq(TestEnum.ACTIVE);

      store.value.activePreset = undefined;
      store.value.nums.splice(1, 1, 3);
      store.value.name = undefined;
      store.value.names.splice(0, 1);
    }

    expect(mock.store).to.deep.eq({
      'dxos.org/setting/num': '42',
      'dxos.org/setting/nums': '[1,3]',
      'dxos.org/setting/names': '["bar"]',
      'dxos.org/setting/status': '1',
    });

    {
      const store = new ObjectStore<TestType>(TestSchema, 'dxos.org/setting', defaultValue, mock);

      expect(store.value.activePreset).to.be.undefined;
      expect(store.value.name).to.be.undefined;
    }
  });
});
