//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type JSONSchema, S } from '@dxos/effect';
import { deepMapValues } from '@dxos/util';

import { toJsonSchema, toEffectSchema, getEchoProp } from './json-schema';
import { PropertyMeta } from '../ast';
import { ref } from '../handler';
import { TypedObject } from '../object';

describe('effect-to-json', () => {
  test('type annotation', () => {
    class Schema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({ field: S.String }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(getEchoProp(jsonSchema).type).to.deep.eq({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    });
  });

  test('field meta annotation', () => {
    const meta = { maxLength: 0 };
    const metaNamespace = 'dxos.test';
    class Schema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      field: S.String.pipe(PropertyMeta(metaNamespace, meta)),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(getEchoProp(jsonSchema.properties.field).annotations[metaNamespace]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      field: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: ref(Nested),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    const nested = jsonSchema.properties.field;
    expectReferenceAnnotation(nested);
  });

  test('array of references', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      field: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.Array(ref(Nested)),
    }) {}

    const jsonSchema = toJsonSchema(Schema);
    expectReferenceAnnotation((jsonSchema.properties.field as any).items);
  });

  test('optional references', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      field: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.optional(ref(Nested)),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties.field);
  });

  test('regular objects are not annotated', () => {
    const object = S.Struct({ field: S.Struct({ field: S.String }) });
    const jsonSchema = toJsonSchema(object);
    expect(getEchoProp(jsonSchema)).to.be.undefined;
    expect(getEchoProp(jsonSchema.properties.field)).to.be.undefined;
  });

  test('annotations', () => {
    class Schema extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String.annotations({ description: 'Person name' }),
      email: S.String.annotations({ description: 'Email address' }).pipe(PropertyMeta('dxos.format', 'email')),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['name', 'email', 'id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', description: 'Person name' },
        email: {
          type: 'string',
          description: 'Email address',
          echo: { annotations: { 'dxos.format': 'email' } },
        },
      },
      additionalProperties: false,
      echo: {
        type: { typename: 'example.com/type/Contact', version: '0.1.0' },
      },
    });
  });

  const expectReferenceAnnotation = (object: JSONSchema.JsonSchema7) => {
    expect(getEchoProp(object).reference).to.deep.eq({
      typename: 'example.com/type/TestNested',
      version: '0.1.0',
    });
  };
});

describe('json-to-effect', () => {
  for (const partial of [false, true]) {
    test('deserialized equals original', () => {
      class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
        field: S.String,
      }) {}

      class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })(
        {
          string: S.String.pipe(S.annotations({ identifier: 'String' })),
          number: S.Number.pipe(PropertyMeta('dxos.test', { is_date: true })),
          boolean: S.Boolean,
          array: S.Array(S.String),
          twoDArray: S.Array(S.Array(S.String)),
          record: S.Record({ key: S.String, value: S.Number }),
          object: S.Struct({ id: S.String, field: ref(Nested) }),
          echoObject: ref(Nested),
          echoObjectArray: S.Array(ref(Nested)),
          email: S.String.pipe(PropertyMeta('dxos.format', 'email')),
          null: S.Null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = toJsonSchema(Schema);
      const schema = toEffectSchema(jsonSchema);
      expect(() => expect(schema.ast).to.deep.eq(Schema.ast)).to.throw();
      expect(() => expect(removeFilterFunction(schema.ast)).to.deep.eq(Schema.ast)).to.throw();
      expect(() => expect(schema.ast).to.deep.eq(removeFilterFunction(Schema.ast))).to.throw();
      expect(removeFilterFunction(schema.ast)).to.deep.eq(removeFilterFunction(Schema.ast));
    });
  }

  const removeFilterFunction = (obj: any): any =>
    deepMapValues(obj, (value: any, recurse, key) => {
      if (key === 'filter') {
        return undefined;
      }
      return recurse(value);
    });
});
