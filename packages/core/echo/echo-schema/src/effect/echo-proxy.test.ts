//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as R from './reactive';
import { expect } from 'chai';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { createEchoReactiveObject, type EchoReactiveObject } from './echo-handler';
import { TestClass, TestSchema, TestSchemaWithClass } from './testing/schema';
import { createDatabase } from '../testing';

registerSignalRuntime();

test('id property name is reserved', () => {
  const invalidSchema = S.struct({ id: S.number });
  expect(() => createEchoReactiveObject(R.object(invalidSchema, { id: 42 }))).to.throw();
});

for (const schema of [undefined, TestSchemaWithClass]) {
  const createObject = (props: Partial<TestSchemaWithClass> = {}): EchoReactiveObject<TestSchemaWithClass> => {
    return createEchoReactiveObject(schema ? R.object(schema, props) : R.object(props));
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

describe('Reactive Object with ECHO database', async () => {
  test('existing proxy objects can be added to the database', async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });

    const obj = R.object(TestSchema, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(R.getSchema(returnObj)).to.eq(TestSchema);
    expect(returnObj === obj).to.be.true;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });

    const obj = db.add({ string: 'foo' });
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    expect(R.getSchema(obj)).to.eq(undefined);
  });
});
