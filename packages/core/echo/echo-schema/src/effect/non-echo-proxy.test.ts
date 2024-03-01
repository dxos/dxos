//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import jestExpect from 'expect';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import * as R from './reactive';
import { TestClass, TestSchemaWithClass } from './testing/schema';
import { updateCounter } from './testutils';

registerSignalRuntime();

for (const schema of [undefined, TestSchemaWithClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): TestSchemaWithClass => {
    return schema == null ? (R.object(props) as TestSchemaWithClass) : R.object(schema, props);
  };

  describe(`Non-echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('inspect', () => {
      const obj = createObject({ string: 'bar' });

      const str = inspect(obj, { colors: false });
      expect(str).to.eq(`${schema == null ? '' : 'Typed '}{ string: 'bar' }`);
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
