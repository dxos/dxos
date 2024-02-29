//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { createEchoReactiveObject, type EchoReactiveObject } from './echo-handler';
import { TestClass, TestSchemaWithClass } from './testing/schema';

registerSignalRuntime();

test('id property name is reserved', () => {
  const invalidSchema = S.struct({ id: S.number });
  expect(() => createEchoReactiveObject({ id: 42 }, invalidSchema)).to.throw();
});

for (const schema of [undefined, TestSchemaWithClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): EchoReactiveObject<TestSchemaWithClass> => {
    return createEchoReactiveObject(props, schema);
  };

  describe(`Non-echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
    test('has id', () => {
      const obj = createObject({ string: 'bar' });
      expect(obj.id).not.to.be.undefined;
    });

    test('inspect', () => {
      const obj = createObject({ string: 'bar' });

      const str = inspect(obj, { colors: false });
      expect(str).to.eq(`${schema == null ? '' : 'Typed'}EchoObject { string: 'bar' }`);
    });

    test('throws when assigning a class instances', () => {
      expect(() => {
        createObject().classInstance = new TestClass();
      }).to.throw();
    });

    test('throws when creates with a class instances', () => {
      expect(() => {
        createObject({ classInstance: new TestClass() });
      }).to.throw();
    });

    test('removes undefined fields on creation', () => {
      const obj = createObject({ undefined });
      expect(obj).to.deep.eq({});
    });
  });
}
