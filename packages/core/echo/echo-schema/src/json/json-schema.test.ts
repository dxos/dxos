//
// Copyright 2022 DXOS.org
//

import { Option, Schema as S, SchemaAST } from 'effect';
import { TitleAnnotationId } from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { findAnnotation, type JsonProp } from '@dxos/effect';
import { log } from '@dxos/log';

import {
  EntityKind,
  FieldLookupAnnotationId,
  getNormalizedEchoAnnotations,
  getSchemaProperty,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
  JsonSchemaType,
  PropertyMeta,
  setSchemaProperty,
} from '../ast';
import { Email, FormatAnnotationId } from '../formats';
import { TypedObject } from '../object';
import { createSchemaReference, getSchemaReference, Ref } from '../ref';
import { StoredSchema } from '../schema';
import { prepareAstForCompare, Testing } from '../testing';
import { toEffectSchema, toJsonSchema } from './json-schema';

const EXAMPLE_NAMESPACE = '@example';

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

  test('property meta annotation', () => {
    const meta = { maxLength: 0 };
    class Schema extends TypedObject({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    })({
      name: S.String.pipe(PropertyMeta(EXAMPLE_NAMESPACE, meta)),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    expect(getNormalizedEchoAnnotations(jsonSchema.properties!.name!)!.meta![EXAMPLE_NAMESPACE]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: Ref(Nested),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    // log.info('schema', { jsonSchema });
    const nested = jsonSchema.properties!.name;
    expectReferenceAnnotation(nested);
  });

  // TODO(ZaymonFC): @dmaretskyi we still need to fix this.
  // eslint-disable-next-line mocha/no-skipped-tests
  // TODO(dmaretskyi): Remove FieldLookupAnnotationId.
  test.skip('reference annotation with lookup property', () => {
    class Nested extends TypedObject({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
      name: S.String,
    }) {}
    class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      name: Ref(Nested).annotations({ [FieldLookupAnnotationId]: 'name' }),
    }) {}
    const jsonSchema = toJsonSchema(Schema);
    const effectSchema = toEffectSchema(jsonSchema);

    const annotation = findAnnotation<string>(effectSchema.ast, FieldLookupAnnotationId);
    expect(annotation).to.not.toBeUndefined();
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
    expect(getNormalizedEchoAnnotations(jsonSchema)).to.be.undefined;
    expect(getNormalizedEchoAnnotations(jsonSchema.properties!.name!)).to.be.undefined;
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

  test('handles suspend -- Contact schema serialization', () => {
    const schema = toJsonSchema(Testing.Contact);
    expect(Object.keys(schema.properties!)).toEqual(['id', 'name', 'username', 'email', 'tasks', 'address']);
  });

  test('reference property by ref', () => {
    class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
      field: S.String,
    }) {}

    class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String,
      organization: Ref(Organization).annotations({ description: 'Contact organization' }),
    }) {}

    // log.info('Contact', { ast: Contact.ast });

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
        organization: {
          $id: '/schemas/echo/ref',
          description: 'Contact organization',
          reference: {
            schema: {
              $ref: 'dxn:type:example.com/type/Organization',
            },
            schemaVersion: '0.1.0',
          },
        },
      },
      required: ['name', 'organization', 'id'],
      propertyOrder: ['name', 'organization', 'id'],
    });
  });

  test('add reference property', () => {
    class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
      field: S.String,
    }) {}

    class Contact extends TypedObject({ typename: 'example.com/type/Contact', version: '0.1.0' })({
      name: S.String,
      organization: Ref(Organization).annotations({ description: 'Contact organization' }),
    }) {}

    const jsonSchema = toJsonSchema(Contact);
    setSchemaProperty(jsonSchema, 'organization' as JsonProp, createSchemaReference(Organization.typename));
    const { typename } = getSchemaReference(getSchemaProperty(jsonSchema, 'organization' as JsonProp) ?? {}) ?? {};
    expect(typename).to.eq(Organization.typename);
  });

  test('serialize circular schema (StoredSchema)', () => {
    const jsonSchema = toJsonSchema(StoredSchema);
    expect(Object.keys(jsonSchema.properties!).length).toBeGreaterThan(0);

    // TODO(dmaretskyi): Currently unable to deserialize.
    // const effectSchema = toEffectSchema(jsonSchema);
    log('schema', { jsonSchema });
  });

  test('tuple schema with description', () => {
    const schema = S.Struct({
      args: S.Tuple(
        S.String.annotations({ description: 'The source currency' }),
        S.String.annotations({ description: 'The target currency' }),
      ),
    });
    const jsonSchema = toJsonSchema(schema);
    log('schema', { jsonSchema });

    (S.asserts(JsonSchemaType) as any)(jsonSchema);
  });

  test('reference with title annotation', () => {
    const schema = S.Struct({
      contact: Ref(Testing.Contact).annotations({ title: 'Custom Title' }),
    });

    // log.info('schema before', { ast: schema.ast });

    const jsonSchema = toJsonSchema(schema);
    // log.info('json schema', { jsonSchema });

    const effectSchema = toEffectSchema(jsonSchema);
    // log.info('effect schema', { ast: effectSchema.ast });

    expect(
      effectSchema.pipe(
        S.pluck('contact'),
        S.typeSchema,
        (s) => s.ast,
        SchemaAST.getAnnotation(TitleAnnotationId),
        Option.getOrUndefined,
      ),
    ).to.eq('Custom Title');
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
    test(`deserialized equals original ${partial ? 'with partial' : ''}`, () => {
      class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
        field: S.String,
      }) {}

      class Schema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })(
        {
          string: S.String,
          number: S.Number.pipe(PropertyMeta(EXAMPLE_NAMESPACE, { is_date: true })),
          boolean: S.Boolean,
          array: S.Array(S.String),
          twoDArray: S.Array(S.Array(S.String)),
          record: S.Record({ key: S.String, value: S.Number }),
          object: S.Struct({ id: S.String, field: Ref(Organization) }),
          echoObject: Ref(Organization),
          echoObjectArray: S.Array(Ref(Organization)),
          email: S.String.annotations({ [FormatAnnotationId]: 'email' }),
          null: S.Null,
        },
        partial ? { partial } : {},
      ) {}

      const jsonSchema = toJsonSchema(Schema);
      // log.info('schema', { jsonSchema });

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
    expect(getTypeAnnotation(schema)).to.deep.eq({
      kind: EntityKind.Object,
      typename: 'example.com/type/Project',
      version: '0.1.0',
    });
    expect(getTypeIdentifierAnnotation(schema)).to.deep.eq('dxn:echo:@:01JERV1HQCQZDQ4NVCJ42QB38F');
  });

  test('symbol annotations get compared', () => {
    const schema1 = S.String.annotations({ [FormatAnnotationId]: 'email' });
    const schema2 = S.String.annotations({ [FormatAnnotationId]: 'currency' });

    expect(prepareAstForCompare(schema1.ast)).not.to.deep.eq(prepareAstForCompare(schema2.ast));
  });

  test('description gets preserved', () => {
    const schema = S.Struct({
      name: S.String.annotations({ description: 'Name' }),
    });
    const jsonSchema = toJsonSchema(schema);
    const effectSchema = toEffectSchema(jsonSchema);
    const jsonSchema2 = toJsonSchema(effectSchema);
    expect(jsonSchema2.properties!.name.description).to.eq('Name');
  });
});

describe('reference', () => {
  test('reference annotation', () => {
    const schema = Ref(Testing.Contact);
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: '/schemas/echo/ref',
      $schema: 'http://json-schema.org/draft-07/schema#',
      reference: {
        schema: {
          $ref: 'dxn:type:example.com/type/Contact',
        },
        schemaVersion: '0.1.0',
      },
    });
  });

  test('title annotation', () => {
    const schema = Ref(Testing.Contact).annotations({ title: 'My custom title' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: '/schemas/echo/ref',
      $schema: 'http://json-schema.org/draft-07/schema#',
      reference: {
        schema: {
          $ref: 'dxn:type:example.com/type/Contact',
        },
        schemaVersion: '0.1.0',
      },
      title: 'My custom title',
    });
  });

  test('description annotation', () => {
    const schema = Ref(Testing.Contact).annotations({ description: 'My custom description' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: '/schemas/echo/ref',
      $schema: 'http://json-schema.org/draft-07/schema#',
      reference: {
        schema: {
          $ref: 'dxn:type:example.com/type/Contact',
        },
        schemaVersion: '0.1.0',
      },
      description: 'My custom description',
    });
  });
});
