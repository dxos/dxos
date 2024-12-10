//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Format, TypedObject } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

import { create } from './object';
import { getSchema } from './proxy';

// TODO(burdon): Declare id?

class Org extends TypedObject({
  typename: 'example.com/type/Org',
  version: '0.1.0',
})({
  name: S.String,
}) {}

class Contact extends TypedObject<Contact>({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(
  {
    name: S.String,
  },
  {
    partial: true,
    record: true,
  },
) {}

const TEST_ORG: Omit<Org, 'id'> = { name: 'Test' };

describe('EchoObject class DSL', () => {
  test('static isInstance check', async ({ expect }) => {
    const obj = create(Org, TEST_ORG);
    expect(obj instanceof Org).to.be.true;
  });

  test('can get object schema', async ({ expect }) => {
    const obj = create(Org, TEST_ORG);
    expect(getSchema(obj)).to.deep.eq(Org);
  });

  describe('class options', () => {
    test('can assign undefined to partial fields', async ({ expect }) => {
      const person = create(Contact, { name: 'John' });
      person.name = undefined;
      person.recordField = 'hello';
      expect(person.name).to.be.undefined;
      expect(person.recordField).to.eq('hello');
    });
  });

  test('record', ({ expect }) => {
    const schema = S.mutable(
      S.Struct({
        meta: S.optional(S.mutable(S.Any)),
        // NOTE: S.Record only supports shallow values.
        // https://www.npmjs.com/package/@effect/schema#mutable-records
        // meta: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
        // meta: S.optional(S.mutable(S.object)),
      }),
    );

    {
      const object = create(schema, {});
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }

    {
      const object = create(schema, {});
      object.meta = { test: { value: 300 } };
      expect(object.meta.test.value).to.eq(300);
    }

    {
      type Test1 = S.Schema.Type<typeof schema>;

      const object: Test1 = {};
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }

    {
      class Test2 extends TypedObject({
        typename: 'dxos.org/type/FunctionTrigger',
        version: '0.1.0',
      })({
        meta: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
      }) {}

      const object = create(Test2, {});
      (object.meta ??= {}).test = 100;
      expect(object.meta.test).to.eq(100);
    }
  });

  // TODO(burdon): Expand. Where should these tests live?
  test('formats', ({ expect }) => {
    const schema = S.Struct({
      email: Format.Email,
      location: Format.GeoPoint,
    });

    const object = create(schema, {
      email: 'hello@dxos.org',
      location: [0.1278, 51.5074],
    });

    expect(object).to.deep.eq({
      email: 'hello@dxos.org',
      location: [0.1278, 51.5074],
    });
  });
});
