//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import type { Live } from '@dxos/live-object';
import { objectData } from '@dxos/live-object';
import { isNode } from '@dxos/util';

import { Testing, updateCounter } from '../testing';
import { ATTR_META } from '../types';

import { live } from './reactive-object';

registerSignalsRuntime();

const TEST_OBJECT: Testing.TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

for (const schema of [undefined, Testing.TestSchemaWithClass]) {
  const createObject = (props: Partial<Testing.TestSchemaWithClass> = {}): Live<Testing.TestSchemaWithClass> => {
    return schema == null ? (live(props) as Testing.TestSchemaWithClass) : live(schema, props);
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

      const classInstance = new Testing.TestClass();
      obj.classInstance = classInstance;
      expect(obj.classInstance!.field).to.eq('value');
      expect(obj.classInstance instanceof Testing.TestClass).to.eq(true);
      expect(obj.classInstance === classInstance).to.be.true;

      obj.classInstance!.field = 'baz';
      expect(obj.classInstance!.field).to.eq('baz');
    });

    describe('class instance equality', () => {
      test('toJSON', () => {
        const original = { classInstance: new Testing.TestClass() };
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
        const original = { classInstance: new Testing.TestClass() };
        const reactive = createObject(original);
        expect(reactive).to.deep.eq(original);
        expect(reactive).to.not.deep.eq({ ...original, number: 11 });
      });

      test('jest deep equal works', () => {
        const original = { classInstance: new Testing.TestClass() };
        const reactive = createObject(original);
        expect(reactive).toEqual(original);
        expect(reactive).not.toEqual({ ...original, number: 11 });
      });
    });

    describe('signal updates', () => {
      test('not in nested class instances', () => {
        const obj = createObject({ classInstance: new Testing.TestClass() });
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
