//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type AST, type JsonProp, S } from '@dxos/effect';
import { deepMapValues } from '@dxos/util';

import { getEchoProp, toEffectSchema, toJsonSchema } from './json-schema';
import {
  PropertyMeta,
  setSchemaProperty,
  type JsonSchemaType,
  getSchemaProperty,
  getObjectAnnotation,
  getEchoIdentifierAnnotation,
  EntityKind,
} from '../ast';
import { createSchemaReference, getSchemaReference, Ref } from '../ast/ref';
import { FormatAnnotationId } from '../formats';
import { Email } from '../formats/string';
import { TypedObject } from '../object';
import { Contact } from '../testing';

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
      name: Ref(Nested),
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
      name: S.Array(Ref(Nested)),
    }) {}

    const jsonSchema = toJsonSchema(Schema);
    expectReferenceAnnotation((jsonSchema.properties!.name as any).items);
  });

  test('optional references', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: S.optional(Ref(Nested)),
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

      entityKind: EntityKind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',

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
      propertyOrder: ['name', 'email', 'id'],
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
      org: Ref(Org).annotations({ description: 'Contact organization' }),
    }) {}

    const jsonSchema = toJsonSchema(Contact);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:type:example.com/type/Contact',

      entityKind: EntityKind.Object,
      typename: 'example.com/type/Contact',
      version: '0.1.0',

      type: 'object',
      additionalProperties: false,

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
      propertyOrder: ['name', 'org', 'id'],
    });
  });

  test('add reference property', () => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      field: S.String,
    }) {}

    class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String,
      org: Ref(Org).annotations({ description: 'Contact organization' }),
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
          object: S.Struct({ id: S.String, field: Ref(Org) }),
          echoObject: Ref(Org),
          echoObjectArray: S.Array(Ref(Org)),
          email: S.String.annotations({ [FormatAnnotationId]: 'email' }),
          null: S.Null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = toJsonSchema(Schema);
      // console.log(JSON.stringify(jsonSchema, null, 2));
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

  test('legacy schema with dxn:type $id gets decoded', () => {
    const jsonSchema: JsonSchemaType = {
      $id: 'dxn:type:example.com/type/Project',
      $schema: 'http://json-schema.org/draft-07/schema#',
      additionalProperties: false,
      echo: {
        type: {
          schemaId: '01JERV1HQCQZDQ4NVCJ42QB38F',
          typename: 'example.com/type/Project',
          version: '0.1.0',
        },
      },
      properties: {
        description: {
          type: 'string',
        },
        id: {
          type: 'string',
        },
        name: {
          echo: {
            generator: 'commerce.productName',
          },
          type: 'string',
        },
      },
      required: ['id'],
      type: 'object',
      version: '0.1.0',
    };

    const schema = toEffectSchema(jsonSchema);
    expect(getObjectAnnotation(schema)).to.deep.eq({
      kind: EntityKind.Object,
      typename: 'example.com/type/Project',
      version: '0.1.0',
    });
    expect(getEchoIdentifierAnnotation(schema)).to.deep.eq('dxn:echo:@:01JERV1HQCQZDQ4NVCJ42QB38F');
  });

  test('symbol annotations get compared', () => {
    const schema1 = S.String.annotations({ [FormatAnnotationId]: 'email' });
    const schema2 = S.String.annotations({ [FormatAnnotationId]: 'currency' });

    expect(prepareAstForCompare(schema1.ast)).not.to.deep.eq(prepareAstForCompare(schema2.ast));
  });

  test('object with oneOf const values and annotations', () => {
    const jsonSchema: JsonSchemaType = {
      type: 'object',
      required: ['selectedOption'], // Add this if we want it required
      properties: {
        selectedOption: {
          oneOf: [
            { const: 'option-1-id', title: 'Small', description: 'Small size option' },
            { const: 'option-2-id', title: 'Medium', description: 'Medium size option' },
            { const: 'option-3-id', title: 'Large', description: 'Large size option' },
          ],
          type: 'string',
        },
      },
    };

    const schema = toEffectSchema(jsonSchema);
    const origSchema = S.Struct({
      selectedOption: S.Union(S.Literal('option-1-id'), S.Literal('option-2-id'), S.Literal('option-3-id')),
    });

    expect(prepareAstForCompare(schema.ast)).to.deep.eq(prepareAstForCompare(origSchema.ast));
  });

  // TODO(ZaymonFC): We need to get this working for durable single-select.
  test.skip('single-select with oneOf round trip', () => {
    const originalSchema = {
      type: 'string',
      format: 'single-select',
      oneOf: [
        { const: 'b590d58c', title: 'Draft', color: 'indigo' },
        { const: '8185fe74', title: 'Active', color: 'cyan' },
        { const: 'e8455752', title: 'Completed', color: 'emerald' },
      ],
      title: 'State',
    } as any as JsonSchemaType;

    const effectSchema = toEffectSchema(originalSchema);
    const roundTrippedSchema = toJsonSchema(effectSchema);

    expect(roundTrippedSchema).to.deep.equal(originalSchema);
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
