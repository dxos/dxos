//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import jestExpect from 'expect';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { create } from './object';
import { TEST_OBJECT, TestClass, TestSchemaWithClass, updateCounter } from '../testing';
import { data, type ReactiveObject } from '../types';

registerSignalRuntime();

for (const schema of [undefined, TestSchemaWithClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): ReactiveObject<TestSchemaWithClass> => {
    return schema == null ? (create(props) as TestSchemaWithClass) : create(schema, props);
  };

  describe(`Non-echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('inspect', () => {
      const obj = createObject({ string: 'bar' });
      const str = inspect(obj, { colors: false });
      expect(str).to.eq(`${schema == null ? '' : 'Typed '}{ string: 'bar' }`);
    });

    test('data symbol', async () => {
      const obj = createObject({ ...TEST_OBJECT });
      const objData: any = (obj as any)[data];
      expect(objData).to.deep.contain({
        '@type': `${schema ? 'Typed' : ''}ReactiveObject`,
        ...TEST_OBJECT,
      });
    });

    test('can assign class instances', () => {
      const obj = createObject();

      const classInstance = new TestClass();
      obj.classInstance = classInstance;
      expect(obj.classInstance.field).to.eq('value');
      expect(obj.classInstance instanceof TestClass).to.eq(true);
      expect(obj.classInstance === classInstance).to.be.true;

      obj.classInstance.field = 'baz';
      expect(obj.classInstance.field).to.eq('baz');
    });

    describe('class instance equality', () => {
      test('toJSON', () => {
        const original = { classInstance: new TestClass() };
        const reactive = createObject(original);
        expect(JSON.stringify(reactive)).to.eq(JSON.stringify(original));
      });

      test('chai deep equal works', () => {
        const original = { classInstance: new TestClass() };
        const reactive = createObject(original);
        expect(JSON.stringify(reactive)).to.eq(JSON.stringify(original));

        expect(reactive).to.deep.eq(original);
        expect(reactive).to.not.deep.eq({ ...original, number: 11 });
      });

      test('jest deep equal works', () => {
        const original = { classInstance: new TestClass() };
        const reactive = createObject(original);

        jestExpect(reactive).toEqual(original);
        jestExpect(reactive).not.toEqual({ ...original, number: 11 });
      });
    });

    describe('signal updates', () => {
      test('not in nested class instances', () => {
        const obj = createObject({ classInstance: new TestClass() });

        using updates = updateCounter(() => {
          obj.classInstance!.field;
        });
        expect(updates.count, 'update count').to.eq(0);

        obj.classInstance!.field = 'baz';
        expect(updates.count, 'update count').to.eq(0);
      });
    });
  });
}

describe('getters', () => {
  test('add getter to object', () => {
    let value = 'foo';
    const obj = create({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.eq('foo');

    value = 'bar';
    expect(obj.getter).to.eq('bar');
  });

  test('signal updates', () => {
    const innerObj = create({
      string: 'bar',
    });

    const obj = create({
      field: 1,
      get getter() {
        return innerObj.string;
      },
    });

    using updates = updateCounter(() => {
      obj.getter;
    });

    innerObj.string = 'baz';
    expect(obj.getter).to.eq('baz');
    expect(updates.count, 'update count').to.eq(1);

    obj.field = 2;
    expect(updates.count, 'update count').to.eq(1);
  });

  test('getter for array', () => {
    const value = [1];
    const obj = create({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.have.length(1);

    value.push(2);
    expect(obj.getter).to.have.length(2);
  });
});
