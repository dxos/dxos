//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { createEchoReactiveObject } from './echo-handler';
import { TestClass, TestSchemaWithClass } from './testing/schema';

registerSignalRuntime();

for (const schema of [undefined, TestSchemaWithClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): TestSchemaWithClass => {
    return createEchoReactiveObject(props, schema);
  };

  describe(`Non-echo specific proxy properties${schema == null ? '' : ' with schema'}`, () => {
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
