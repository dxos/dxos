//
// Copyright 2022 DXOS.org
//

import * as JSONSchema from '@effect/schema/JSONSchema';
import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { EchoObjectSchema } from './echo-object-class';
import { effectToJsonSchema, getTypename, jsonToEffectSchema, toEffectSchema, toJsonSchema } from './json-schema';
import * as E from './reactive';
import { type EchoObjectAnnotation, getSchema, object } from './reactive';
import { Expando } from '../object';
import { Schema } from '../proto';

describe('JSON Schema', () => {
  test('convert schema to JSON schema', async () => {
    const contact = new Schema({
      typename: 'example.com/schema/contact',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
          description: 'name of the person',
        },
      ],
    });

    {
      const jsonSchema = toJsonSchema(contact);
      expect(jsonSchema.$id).to.eq('example.com/schema/contact');
    }

    {
      const person = new Expando(
        {
          name: 'Satoshi',
        },
        { schema: contact },
      );

      const jsonSchema = toJsonSchema(person.__schema!);
      expect(jsonSchema.$id).to.eq('example.com/schema/contact');
    }
  });

  test('convert schema to ts-effect schema', async () => {
    const echoSchema = new Schema({
      typename: 'example.com/schema/contact',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
          description: 'name of the person',
        },
        {
          id: 'active',
          type: Schema.PropType.BOOLEAN,
          description: 'person is online',
        },
        {
          id: 'activity',
          type: Schema.PropType.NUMBER,
          description: 'activity score',
        },
      ],
    });

    // Convert to ts-effect schema.
    const Contact = toEffectSchema(echoSchema);
    type Contact = S.Schema.Type<typeof Contact>;

    const person: Contact = object(Contact, {
      name: 'Satoshi',
      active: true,
      activity: 100,
    });

    expect(getSchema(person)).to.equal(Contact);

    // Convert to JSON schema.
    const jsonSchema = JSONSchema.make(Contact);
    // console.log('JSON schema', JSON.stringify(jsonSchema, undefined, 2));
    expect(jsonSchema.$schema).to.eq('http://json-schema.org/draft-07/schema#');
    expect(getTypename(jsonSchema as any)).to.eq('example.com/schema/contact');
  });
});

const testSchema: EchoObjectAnnotation = { typename: 'Test', version: '0.1.0' };

describe('effect-to-json', () => {
  const ECHO_KEY = '$echo';

  test('type annotation', () => {
    class Schema extends EchoObjectSchema(testSchema)({ field: S.string }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema[ECHO_KEY].type).to.deep.eq(testSchema);
  });

  test('field meta annotation', () => {
    const fieldMeta = { maxLength: 0 };
    const metaNamespace = 'dxos.test';
    class Schema extends EchoObjectSchema(testSchema)({
      field: S.string.pipe(E.fieldMeta(metaNamespace, fieldMeta)),
    }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema.properties.field[ECHO_KEY].fieldMeta[metaNamespace]).to.deep.eq(fieldMeta);
  });

  test('reference annotation', () => {
    class DeepNested extends EchoObjectSchema(testSchema)({ field: S.string }) {}
    class Nested extends EchoObjectSchema(testSchema)({ field: E.ref(DeepNested) }) {}
    class Schema extends EchoObjectSchema(testSchema)({ field: E.ref(Nested) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    const nested = jsonSchema.properties.field;
    expectReferenceAnnotation(nested);
    expectReferenceAnnotation(nested.properties.field);
  });

  test('array of references', () => {
    class Nested extends EchoObjectSchema(testSchema)({ field: S.string }) {}
    class Schema extends EchoObjectSchema(testSchema)({ field: S.array(E.ref(Nested)) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field.items);
  });

  test('optional references', () => {
    class Nested extends EchoObjectSchema(testSchema)({ field: S.string }) {}
    class Schema extends EchoObjectSchema(testSchema)({ field: S.optional(E.ref(Nested)) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field);
  });

  test('regular objects are not annotated', () => {
    const object = S.struct({ field: S.struct({ field: S.string }) });
    const jsonSchema = effectToJsonSchema(object);
    expect(jsonSchema[ECHO_KEY]).to.be.undefined;
    expect(jsonSchema.properties.field[ECHO_KEY]).to.be.undefined;
  });

  const expectReferenceAnnotation = (object: any) => {
    expect(object[ECHO_KEY].type).to.deep.eq(testSchema);
    expect(object[ECHO_KEY].reference).to.deep.eq(testSchema);
  };
});

describe('json-to-effect', () => {
  for (const partial of [false, true]) {
    test('deserialized equals original', () => {
      class DeepNested extends EchoObjectSchema(testSchema)({ field: S.string }) {}

      class Nested extends EchoObjectSchema(testSchema)({ field: E.ref(DeepNested) }) {}

      class Schema extends EchoObjectSchema(testSchema)(
        {
          string: S.string.pipe(S.identifier('String')),
          number: S.number.pipe(E.fieldMeta('dxos.test', { is_date: true })),
          boolean: S.boolean,
          array: S.array(S.string),
          twoDArray: S.array(S.array(S.string)),
          record: S.record(S.string, S.number),
          object: S.struct({ id: S.string, field: E.ref(Nested) }),
          echoObject: E.ref(Nested),
          echoObjectArray: S.array(E.ref(Nested)),
          null: S.null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = effectToJsonSchema(Schema);
      const schema = jsonToEffectSchema(jsonSchema);
      expect(schema.ast).to.deep.eq(Schema.ast);
    });
  }
});
