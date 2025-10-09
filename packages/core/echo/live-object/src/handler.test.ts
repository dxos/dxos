//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { isNode } from '@dxos/util';

import { live } from './object';
import { objectData } from './proxy';
import { updateCounter } from './testing';

registerSignalsRuntime();

class TestClass {
  field = 'value';
  toJSON() {
    return { field: this.field };
  }
}

const TEST_OBJECT = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

describe(`Reactive Object`, () => {
  test.skipIf(!isNode())('inspect', () => {
    const obj = live({ string: 'bar' });
    const str = inspect(obj, { colors: false });
    expect(str).to.eq(`{ string: 'bar' }`);
  });

  test('data symbol', async () => {
    const obj = live({ ...TEST_OBJECT });
    const objData: any = (obj as any)[objectData];
    expect(objData).to.deep.contain({
      '@type': `ReactiveObject`,
      ...TEST_OBJECT,
    });
  });

  test('can assign class instances', () => {
    const obj = live({}) as any;

    const classInstance = new TestClass();
    obj.classInstance = classInstance;
    expect(obj.classInstance!.field).to.eq('value');
    expect(obj.classInstance instanceof TestClass).to.eq(true);
    expect(obj.classInstance === classInstance).to.be.true;

    obj.classInstance!.field = 'baz';
    expect(obj.classInstance!.field).to.eq('baz');
  });

  describe('class instance equality', () => {
    test('toJSON', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(JSON.stringify(reactive)).to.eq(JSON.stringify(original));
    });

    test('chai deep equal works', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(reactive).to.deep.eq(original);
      expect(reactive).to.not.deep.eq({ ...original, number: 11 });
    });

    test('jest deep equal works', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(reactive).toEqual(original);
      expect(reactive).not.toEqual({ ...original, number: 11 });
    });
  });

  describe('signal updates', () => {
    test('not in nested class instances', () => {
      const obj = live({ classInstance: new TestClass() });
      using updates = updateCounter(() => {
        obj.classInstance!.field;
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.classInstance!.field = 'baz';
      expect(updates.count, 'update count').to.eq(0);
    });
  });
});

describe('getters', () => {
  test('add getter to object', () => {
    let value = 'foo';
    const obj = live({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.eq('foo');

    value = 'bar';
    expect(obj.getter).to.eq('bar');
  });

  test('signal updates', () => {
    const innerObj = live({
      string: 'bar',
    });

    const obj = live({
      field: 1,
      get getter() {
        return innerObj.string;
      },
    });

    using updates = updateCounter(() => {
      const value = obj.getter;
      expect(value).to.exist;
    });

    innerObj.string = 'baz';
    expect(obj.getter).to.eq('baz');
    expect(updates.count, 'update count').to.eq(1);

    obj.field = 2;
    expect(updates.count, 'update count').to.eq(1);
  });

  test('getter for array', () => {
    const value = [1];
    const obj = live({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.have.length(1);

    value.push(2);
    expect(obj.getter).to.have.length(2);
  });
});
