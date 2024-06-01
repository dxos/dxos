//
// Copyright 2022 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { effectToJsonSchema, jsonToEffectSchema } from './json-schema';
import { fieldMeta, ref } from '../annotations';
import { TEST_SCHEMA_TYPE } from '../testing';
import { TypedObject } from '../typed-object-class';

describe('effect-to-json', () => {
  const ECHO_KEY = '$echo';

  test('type annotation', () => {
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema[ECHO_KEY].type).to.deep.eq(TEST_SCHEMA_TYPE);
  });

  test('field meta annotation', () => {
    const meta = { maxLength: 0 };
    const metaNamespace = 'dxos.test';
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({
      field: S.String.pipe(fieldMeta(metaNamespace, meta)),
    }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expect(jsonSchema.properties.field[ECHO_KEY].fieldMeta[metaNamespace]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    class DeepNested extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}
    class Nested extends TypedObject(TEST_SCHEMA_TYPE)({ field: ref(DeepNested) }) {}
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({ field: ref(Nested) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    const nested = jsonSchema.properties.field;
    expectReferenceAnnotation(nested);
    expectReferenceAnnotation(nested.properties.field);
  });

  test('array of references', () => {
    class Nested extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.Array(ref(Nested)) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field.items);
  });

  test('optional references', () => {
    class Nested extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}
    class Schema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.optional(ref(Nested)) }) {}
    const jsonSchema = effectToJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field);
  });

  test('regular objects are not annotated', () => {
    const object = S.Struct({ field: S.Struct({ field: S.String }) });
    const jsonSchema = effectToJsonSchema(object);
    expect(jsonSchema[ECHO_KEY]).to.be.undefined;
    expect(jsonSchema.properties.field[ECHO_KEY]).to.be.undefined;
  });

  const expectReferenceAnnotation = (object: any) => {
    expect(object[ECHO_KEY].type).to.deep.eq(TEST_SCHEMA_TYPE);
    expect(object[ECHO_KEY].reference).to.deep.eq(TEST_SCHEMA_TYPE);
  };
});

describe('json-to-effect', () => {
  for (const partial of [false, true]) {
    test('deserialized equals original', () => {
      class DeepNested extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}

      class Nested extends TypedObject(TEST_SCHEMA_TYPE)({ field: ref(DeepNested) }) {}

      class Schema extends TypedObject(TEST_SCHEMA_TYPE)(
        {
          string: S.String.pipe(S.identifier('String')),
          number: S.Number.pipe(fieldMeta('dxos.test', { is_date: true })),
          boolean: S.Boolean,
          array: S.Array(S.String),
          twoDArray: S.Array(S.Array(S.String)),
          record: S.Record(S.String, S.Number),
          object: S.Struct({ id: S.String, field: ref(Nested) }),
          echoObject: ref(Nested),
          echoObjectArray: S.Array(ref(Nested)),
          null: S.Null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = effectToJsonSchema(Schema);
      const schema = jsonToEffectSchema(jsonSchema);
      expect(schema.ast).to.deep.eq(Schema.ast);
    });
  }
});
