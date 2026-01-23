//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { type Live, objectData } from '@dxos/live-object';
import { isNode } from '@dxos/util';

import { TestSchema, updateCounter } from '../../testing';
import { createObject } from '../object';
import { ATTR_META } from '../types';

import { makeObject } from './make-object';

describe('proxy', () => {
  test.skipIf(!isNode())('inspect', ({ expect }) => {
    const obj = createObject(TestSchema.Message, { timestamp: new Date().toISOString() });
    const str = inspect(obj, { colors: true });
    expect(str).to.exist;
  });
});

const TEST_OBJECT: TestSchema.ExampleSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  nested: {
    field: 'bar',
  },
};

for (const schema of [undefined, TestSchema.ExampleSchema]) {
  const createObject = (props: Partial<TestSchema.ExampleSchema> = {}): Live<TestSchema.ExampleSchema> => {
    return schema == null ? (makeObject(props) as TestSchema.ExampleSchema) : makeObject(schema, props);
  };

  describe(`Non-echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test.skipIf(!isNode())('inspect', () => {
      const obj = createObject({ string: 'bar' });
      const str = inspect(obj, { colors: false });
      expect(str).to.eq(`${schema == null ? '' : 'Typed '}{ string: 'bar' }`);
    });

    test('data symbol', async () => {
      const obj = createObject({ ...TEST_OBJECT });
      const objData: any = (obj as any)[objectData];
      expect(objData).to.deep.contain({
        '@type': `${schema ? 'Typed' : ''}ReactiveObject`,
        ...TEST_OBJECT,
      });
    });

    test('can assign class instances', () => {
      const obj = createObject();

      const classInstance = new TestSchema.TestClass();
      obj.classInstance = classInstance;
      expect(obj.classInstance!.field).to.eq('value');
      expect(obj.classInstance instanceof TestSchema.TestClass).to.eq(true);
      expect(obj.classInstance === classInstance).to.be.true;

      obj.classInstance!.field = 'baz';
      expect(obj.classInstance!.field).to.eq('baz');
    });

    describe('class instance equality', () => {
      test('toJSON', () => {
        const original = { classInstance: new TestSchema.TestClass() };
        const reactive = createObject(original);
        if (!schema) {
          expect(JSON.stringify(reactive)).to.eq(JSON.stringify(original));
        } else {
          expect(JSON.stringify(reactive)).to.eq(
            JSON.stringify({
              [ATTR_META]: {
                keys: [],
              },
              ...original,
            }),
          );
        }
      });

      test('chai deep equal works', () => {
        const original = { classInstance: new TestSchema.TestClass() };
        const reactive = createObject(original);
        expect(reactive).to.deep.eq(original);
        expect(reactive).to.not.deep.eq({ ...original, number: 11 });
      });

      test('jest deep equal works', () => {
        const original = { classInstance: new TestSchema.TestClass() };
        const reactive = createObject(original);
        expect(reactive).toEqual(original);
        expect(reactive).not.toEqual({ ...original, number: 11 });
      });
    });

    describe('subscription updates', () => {
      test('not triggered by nested class instance changes', () => {
        const obj = createObject({ classInstance: new TestSchema.TestClass() });
        using updates = updateCounter(obj);
        expect(updates.count, 'update count').to.eq(0);

        // Changes to class instance fields don't trigger subscription updates
        // because class instances aren't wrapped in live proxies.
        obj.classInstance!.field = 'baz';
        expect(updates.count, 'update count').to.eq(0);
      });
    });
  });
}

describe('getters', () => {
  test('add getter to object', () => {
    let value = 'foo';
    const obj = makeObject({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.eq('foo');

    value = 'bar';
    expect(obj.getter).to.eq('bar');
  });

  test('subscription updates on inner object', () => {
    const innerObj = makeObject({
      string: 'bar',
    });

    const obj = makeObject({
      field: 1,
      get getter() {
        return innerObj.string;
      },
    });

    // Subscribe to innerObj to detect changes.
    using innerUpdates = updateCounter(innerObj);
    using objUpdates = updateCounter(obj);

    innerObj.string = 'baz';
    expect(obj.getter).to.eq('baz');
    expect(innerUpdates.count, 'inner update count').to.eq(1);

    // Changes to outer obj don't affect inner subscription.
    obj.field = 2;
    expect(innerUpdates.count, 'inner update count').to.eq(1);
    expect(objUpdates.count, 'obj update count').to.eq(1);
  });

  test('getter for array', () => {
    const value = [1];
    const obj = makeObject({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.have.length(1);

    value.push(2);
    expect(obj.getter).to.have.length(2);
  });
});
