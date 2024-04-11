//
// Copyright 2022 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { TypedObject } from './echo-object-class';
import { effectToJsonSchema, jsonToEffectSchema } from './json-schema';
import * as E from './reactive';
import { type EchoObjectAnnotation } from './reactive';

const testSchema: EchoObjectAnnotation = { typename: 'Test', version: '0.1.0' };

describe('effect-to-json', () => {
  const ECHO_KEY = '$echo';

  test('type annotation', () => {
    class Schema extends TypedObject(testSchema)({ field: S.string }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema[ECHO_KEY].type).to.deep.eq(testSchema);
  });

  test('field meta annotation', () => {
    const fieldMeta = { maxLength: 0 };
    const metaNamespace = 'dxos.test';
    class Schema extends TypedObject(testSchema)({
      field: S.string.pipe(E.fieldMeta(metaNamespace, fieldMeta)),
    }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema.properties.field[ECHO_KEY].fieldMeta[metaNamespace]).to.deep.eq(fieldMeta);
  });

  test('reference annotation', () => {
    class DeepNested extends TypedObject(testSchema)({ field: S.string }) {}
    class Nested extends TypedObject(testSchema)({ field: E.ref(DeepNested) }) {}
    class Schema extends TypedObject(testSchema)({ field: E.ref(Nested) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    const nested = jsonSchema.properties.field;
    expectReferenceAnnotation(nested);
    expectReferenceAnnotation(nested.properties.field);
  });

  test('array of references', () => {
    class Nested extends TypedObject(testSchema)({ field: S.string }) {}
    class Schema extends TypedObject(testSchema)({ field: S.array(E.ref(Nested)) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field.items);
  });

  test('optional references', () => {
    class Nested extends TypedObject(testSchema)({ field: S.string }) {}
    class Schema extends TypedObject(testSchema)({ field: S.optional(E.ref(Nested)) }) {}
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
      class DeepNested extends TypedObject(testSchema)({ field: S.string }) {}

      class Nested extends TypedObject(testSchema)({ field: E.ref(DeepNested) }) {}

      class Schema extends TypedObject(testSchema)(
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
