//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type AST, type JsonProp, S } from '@dxos/effect';
import { deepMapValues } from '@dxos/util';

import { getEchoProp, toEffectSchema, toJsonSchema } from './json-schema';
import { PropertyMeta, setSchemaProperty, type JsonSchemaType, getSchemaProperty } from '../ast';
import { FormatAnnotationId } from '../formats';
import { Email } from '../formats/string';
import { TypedObject } from '../object';
import { Contact } from '../testing';
import { createSchemaReference, getSchemaReference, ref } from '../ast';

describe('effect-to-json', () => {
  test('type annotation', () => {
    class Schema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({ name: S.String }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect((jsonSchema as any).$id).toEqual('dxn:type:example.com/type/Test');
    expect((jsonSchema as any).version).toEqual('0.1.0');
  });

  test('field meta annotation', () => {
    const meta = { maxLength: 0 };
    const metaNamespace = 'dxos.test';
    class Schema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      name: S.String.pipe(PropertyMeta(metaNamespace, meta)),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(getEchoProp(jsonSchema.properties!.name).annotations[metaNamespace]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: ref(Nested),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    const nested = jsonSchema.properties!.name;
    expectReferenceAnnotation(nested);
  });

  test('array of references', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: S.Array(ref(Nested)),
    }) {}

    const jsonSchema = toJsonSchema(Schema);
    expectReferenceAnnotation((jsonSchema.properties!.name as any).items);
  });

  test('optional references', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: S.optional(ref(Nested)),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expectReferenceAnnotation(jsonSchema.properties!.name);
  });

  test('regular objects are not annotated', () => {
    const object = S.Struct({ name: S.Struct({ name: S.String }) });
    const jsonSchema = toJsonSchema(object);
    expect(getEchoProp(jsonSchema)).to.be.undefined;
    expect(getEchoProp(jsonSchema.properties!.name)).to.be.undefined;
  });

  test('annotations', () => {
    class Schema extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String.annotations({ description: 'Person name', title: 'Name' }),
      email: S.String.annotations({ description: 'Email address', [FormatAnnotationId]: 'email' }),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(jsonSchema).to.deep.eq({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:type:example.com/type/Contact',
      version: '0.1.0',

      // TODO(dmaretskyi): Remove this.
      echo: {
        type: {
          typename: 'example.com/type/Contact',
          version: '0.1.0',
        },
      },

      type: 'object',
      required: ['name', 'email', 'id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', title: 'Name', description: 'Person name' },
        email: {
          type: 'string',
          description: 'Email address',
          format: 'email',
        },
      },
      additionalProperties: false,
    });
  });

  test('Contact schema serialization', () => {
    const schema = toJsonSchema(Contact);
    expect(Object.keys(schema.properties!)).toEqual(['id', 'name', 'username', 'email', 'tasks', 'address']);
  });

  test('reference property by ref', () => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      field: S.String,
    }) {}

    class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String,
      org: ref(Org).annotations({ description: 'Contact organization' }),
    }) {}

    const jsonSchema = toJsonSchema(Contact);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:type:example.com/type/Contact',
      version: '0.1.0',
      type: 'object',
      additionalProperties: false,

      // TODO(dmaretskyi): Should remove.
      echo: {
        type: {
          typename: 'example.com/type/Contact',
          version: '0.1.0',
        },
      },
      properties: {
        id: {
          type: 'string',
        },
        name: {
          type: 'string',
        },
        org: {
          $id: '/schemas/echo/ref',
          description: 'Contact organization',
          reference: {
            schema: {
              $ref: 'dxn:type:example.com/type/Org',
            },
            schemaVersion: '0.1.0',
          },
        },
      },
      required: ['name', 'org', 'id'],
    });
  });

  test('add reference property', () => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      field: S.String,
    }) {}

    class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String,
      org: ref(Org).annotations({ description: 'Contact organization' }),
    }) {}

    const jsonSchema = toJsonSchema(Contact);
    setSchemaProperty(jsonSchema, 'employer' as JsonProp, createSchemaReference(Org.typename));
    const { typename } = getSchemaReference(getSchemaProperty(jsonSchema, 'employer' as JsonProp) ?? {}) ?? {};
    expect(typename).to.eq(Org.typename);
  });

  const expectReferenceAnnotation = (object: JsonSchemaType) => {
    expect(object.reference).to.deep.eq({
      schema: {
        $ref: 'dxn:type:example.com/type/TestNested',
      },
      schemaVersion: '0.1.0',
    });
  };
});

describe('json-to-effect', () => {
  describe('field schema', () => {
    test('email', () => {
      const schema = Email;
      expect(toJsonSchema(schema)).to.deep.eq({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'string',
        format: 'email',
        title: 'Email',
        description: 'Email address',
        // TODO(dmaretskyi): omit pattern.
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      });
    });
  });

  for (const partial of [false, true]) {
    test('deserialized equals original', () => {
      class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
        field: S.String,
      }) {}

      class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })(
        {
          string: S.String,
          number: S.Number.pipe(PropertyMeta('dxos.test', { is_date: true })),
          boolean: S.Boolean,
          array: S.Array(S.String),
          twoDArray: S.Array(S.Array(S.String)),
          record: S.Record({ key: S.String, value: S.Number }),
          object: S.Struct({ id: S.String, field: ref(Org) }),
          echoObject: ref(Org),
          echoObjectArray: S.Array(ref(Org)),
          email: S.String.annotations({ [FormatAnnotationId]: 'email' }),
          null: S.Null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = toJsonSchema(Schema);
      // log.info('', { jsonSchema });
      const schema = toEffectSchema(jsonSchema);

      expect(() => expect(schema.ast).to.deep.eq(Schema.ast)).to.throw();
      expect(() => expect(prepareAstForCompare(schema.ast)).to.deep.eq(Schema.ast)).to.throw();
      expect(() => expect(schema.ast).to.deep.eq(prepareAstForCompare(Schema.ast))).to.throw();
      // log.info('', { original: prepareAstForCompare(Schema.ast), deserialized: prepareAstForCompare(schema.ast) });
      expect(prepareAstForCompare(schema.ast)).to.deep.eq(prepareAstForCompare(Schema.ast));

      // TODO(dmaretskyi): Fix.
      // expect(
      //   AST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'email')!.type.annotations[
      //     FormatAnnotationId
      //   ],
      // ).toEqual('email');
    });
  }

  test('symbol annotations get compared', () => {
    const schema1 = S.String.annotations({ [FormatAnnotationId]: 'email' });
    const schema2 = S.String.annotations({ [FormatAnnotationId]: 'currency' });

    expect(prepareAstForCompare(schema1.ast)).not.to.deep.eq(prepareAstForCompare(schema2.ast));
  });

  const prepareAstForCompare = (obj: AST.AST): any =>
    deepMapValues(obj, (value: any, recurse, key) => {
      if (typeof value === 'function') {
        return null;
      }

      // Convert symbols to strings.
      if (typeof value === 'object') {
        const clone = { ...value };
        for (const sym of Object.getOwnPropertySymbols(clone as any)) {
          clone[sym.toString()] = clone[sym];
          delete clone[sym];
        }
        return recurse(clone);
      }

      return recurse(value);
    });
});
