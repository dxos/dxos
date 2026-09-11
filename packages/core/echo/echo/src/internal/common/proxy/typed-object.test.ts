//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Types from 'effect/Types';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Obj from '../../../Obj.ts';
import * as Type from '../../../Type.ts';
import { EchoObjectSchema } from '../../Entity/index.ts';
import { getSchema } from '../types/index.ts';
import { makeObject } from './make-object.ts';
import { change } from './reactive.ts';

const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(EchoObjectSchema(DXN.make('com.example.type.organization', '0.1.0')));

type Organization = Type.InstanceType<typeof Organization>;

const Contact = Schema.StructWithRest(Schema.Struct({ name: Schema.String }).mapFields(Struct.map(Schema.optional)), [
  Schema.Record(Schema.String, Schema.Any),
]).pipe(EchoObjectSchema(DXN.make('com.example.type.person', '0.1.0')));

type Contact = Type.InstanceType<typeof Contact>;

const TEST_ORG = { name: 'Test' } satisfies Pick<Organization, 'name'>;

describe('EchoObjectSchema class DSL', () => {
  test('can get object schema', async () => {
    const obj = Obj.make(Organization, TEST_ORG);
    expect(getSchema(obj)).to.deep.eq(Type.getSchema(Organization));
  });

  describe('class options', () => {
    test('can assign undefined to partial fields', async () => {
      const person = Obj.make(Contact, { name: 'John' });
      change(person, (p) => {
        p.name = undefined;
        p.recordField = 'hello';
      });
      expect(person.name).to.be.undefined;
      expect(person.recordField).to.eq('hello');
    });
  });

  test('record', () => {
    const schema = Schema.Struct({
      meta: Schema.optional(Schema.Any),
      // NOTE: Schema.Record only supports shallow values.
      // https://www.npmjs.com/package/@effect/schema#mutable-records
      // meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
      // meta: Schema.optional(Schema.object),
    });

    {
      const object = makeObject(schema, {});
      change(object, (o) => {
        (o.meta ??= {}).test = 100;
      });
      expect(object.meta!.test).to.eq(100);
    }

    {
      const object = makeObject(schema, {});
      change(object, (o) => {
        o.meta = { test: { value: 300 } };
      });
      expect(object.meta!.test.value).to.eq(300);
    }

    {
      // Plain object (not a reactive proxy) - doesn't need Obj.update.
      // Note: Schema.Schema.Type generates readonly types, so we cast to mutable for plain objects.
      type Test1 = Types.Mutable<Schema.Schema.Type<typeof schema>>;

      const object: Test1 = {};
      (object.meta ??= {}).test = 100;
      expect(object.meta!.test).to.eq(100);
    }

    {
      const Test2 = Schema.Struct({
        meta: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
      }).pipe(EchoObjectSchema(DXN.make('org.dxos.type.functionTrigger', '0.1.0')));

      const object = Obj.make(Test2, {});
      change(object, (o) => {
        (o.meta ??= {}).test = 100;
      });
      expect(object.meta!.test).to.eq(100);
    }
  });
});
