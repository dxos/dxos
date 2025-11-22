//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { EchoObject } from '../entities';
import { TypedObject } from '../object';
import { getSchema } from '../types';

import { live } from './reactive-object';

const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(
  EchoObject({
    typename: 'example.com/type/Organization',
    version: '0.1.0',
  }),
);

interface Organization extends Schema.Schema.Type<typeof Organization> {}

const Contact = Schema.Struct(
  {
    name: Schema.String,
  },
  { key: Schema.String, value: Schema.Any },
).pipe(
  Schema.partial,
  EchoObject({
    typename: 'example.com/type/Person',
    version: '0.1.0',
  }),
);

interface Contact extends Schema.Schema.Type<typeof Contact> {}

const TEST_ORG: Omit<Organization, 'id'> = { name: 'Test' };

describe('EchoObject class DSL', () => {
  test('can get object schema', async () => {
    const obj = live(Organization, TEST_ORG);
    expect(getSchema(obj)).to.deep.eq(Organization);
  });

  describe('class options', () => {
    test('can assign undefined to partial fields', async () => {
      const person = live(Contact, { name: 'John' });
      person.name = undefined;
      person.recordField = 'hello';
      expect(person.name).to.be.undefined;
      expect(person.recordField).to.eq('hello');
    });
  });

  test('record', () => {
    const schema = Schema.mutable(
      Schema.Struct({
        meta: Schema.optional(Schema.mutable(Schema.Any)),
        // NOTE: Schema.Record only supports shallow values.
        // https://www.npmjs.com/package/@effect/schema#mutable-records
        // meta: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
        // meta: Schema.optional(Schema.mutable(Schema.object)),
      }),
    );

    {
      const object = live(schema, {});
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }

    {
      const object = live(schema, {});
      object.meta = { test: { value: 300 } };
      expect(object.meta.test.value).to.eq(300);
    }

    {
      type Test1 = Schema.Schema.Type<typeof schema>;

      const object: Test1 = {};
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }

    {
      class Test2 extends TypedObject({
        typename: 'dxos.org/type/FunctionTrigger',
        version: '0.1.0',
      })({
        meta: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
      }) {}

      const object = live(Test2, {});
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }
  });
});
