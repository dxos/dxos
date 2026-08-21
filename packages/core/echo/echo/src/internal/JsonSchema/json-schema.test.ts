//
// Copyright 2022 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { describe, expect, test } from 'vitest';

import { SchemaAST, SchemaEx } from '@dxos/effect';
import { DXN, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

import { TestSchema, prepareAstForCompare } from '../../testing';
import * as Type from '../../Type';
import {
  FieldLookupAnnotationId,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMeta,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
} from '../Annotation';
import { EntityKind } from '../common/types';
import { EchoObjectSchema } from '../Entity';
import { Email, FormatAnnotation, TypeFormat } from '../Format';
import { JsonSchemaType, getNormalizedEchoAnnotations, getSchemaProperty, setSchemaProperty } from '../JsonSchema';
import { Ref, createSchemaReference, getReferenceAst, getSchemaReference } from '../Ref';
import { TypeSchema } from '../Type';
import { toEffectSchema, toJsonSchema } from './json-schema';

const EXAMPLE_NAMESPACE = '@example';

describe('effect-to-json', () => {
  test('type annotation', () => {
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(Schema.Struct({ name: Schema.String }));
    const jsonSchema = toJsonSchema(Test);
    expect(jsonSchema.$id).toEqual('dxn:com.example.type.test:0.1.0');
    expect(jsonSchema.version).toEqual('0.1.0');
  });

  test('property meta annotation', () => {
    const meta = { maxLength: 0 };
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        name: Schema.String.pipe(PropertyMeta(EXAMPLE_NAMESPACE, meta)),
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    expect(getNormalizedEchoAnnotations(jsonSchema.properties!.name!)!.meta![EXAMPLE_NAMESPACE]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
      }),
    );
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        name: Ref(Nested),
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    // log.info('schema', { jsonSchema });
    const nested = jsonSchema.properties!.name;
    expectReferenceAnnotation(nested);
  });

  // TODO(ZaymonFC): @dmaretskyi we still need to fix this.
  // TODO(dmaretskyi): Remove FieldLookupAnnotationId.
  test.skip('reference annotation with lookup property', () => {
    const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
      }),
    );
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        name: Ref(Nested).annotate({ [FieldLookupAnnotationId]: 'name' }),
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    const effectSchema = toEffectSchema(jsonSchema);

    const annotation = SchemaEx.findAnnotation<string>(effectSchema.ast, FieldLookupAnnotationId);
    expect(annotation).to.not.toBeUndefined();
  });

  test('array of references', () => {
    const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
      }),
    );
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        name: Schema.Array(Ref(Nested)),
      }),
    );

    const jsonSchema = toJsonSchema(Test);
    expectReferenceAnnotation((jsonSchema.properties!.name as any).items);
  });

  test('optional references', () => {
    const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
      }),
    );
    const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        name: Schema.optional(Ref(Nested)),
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    expectReferenceAnnotation(jsonSchema.properties!.name);
  });

  test('regular objects are not annotated', () => {
    const object = Schema.Struct({ name: Schema.Struct({ name: Schema.String }) });
    const jsonSchema = toJsonSchema(object);
    expect(getNormalizedEchoAnnotations(jsonSchema)).to.be.undefined;
    expect(getNormalizedEchoAnnotations(jsonSchema.properties!.name!)).to.be.undefined;
  });

  test('annotations', () => {
    const TempSchema = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
      Schema.Struct({
        name: Schema.String.annotate({ description: 'Person name', title: 'Name' }),
        email: Schema.String.pipe(FormatAnnotation.set(TypeFormat.Email)).annotate({
          description: 'Email address',
        }),
      }),
    );

    const jsonSchema = toJsonSchema(TempSchema);
    expect(jsonSchema).to.deep.eq({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:com.example.type.person:0.1.0',

      entityKind: EntityKind.Object,
      typename: 'com.example.type.person',
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
    const schema = toJsonSchema(TestSchema.Person);
    expect(Object.keys(schema.properties!)).toEqual([
      'id',
      'name',
      'username',
      'email',
      'age',
      'tasks',
      'employer',
      'address',
      'fields',
    ]);
  });

  test('reference property by ref', () => {
    const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(
      Schema.Struct({
        field: Schema.String,
      }),
    );

    const Contact = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
        organization: Ref(Organization).annotate({ description: 'Contact organization' }),
      }),
    );

    // log.info('Contact', { ast: Contact.ast });

    const jsonSchema = toJsonSchema(Contact);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:com.example.type.person:0.1.0',

      entityKind: EntityKind.Object,
      typename: 'com.example.type.person',
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
          $ref: '/schemas/echo/ref',
          description: 'Contact organization',
          reference: {
            schema: {
              $ref: 'dxn:com.example.type.organization',
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
    const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(
      Schema.Struct({
        field: Schema.String,
      }),
    );

    const Contact = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
        organization: Ref(Organization).annotate({ description: 'Contact organization' }),
      }),
    );

    const jsonSchema = toJsonSchema(Contact);
    setSchemaProperty(
      jsonSchema,
      'organization' as SchemaEx.JsonProp,
      createSchemaReference(Type.getTypename(Organization)),
    );
    const { typename } =
      getSchemaReference(getSchemaProperty(jsonSchema, 'organization' as SchemaEx.JsonProp) ?? {}) ?? {};
    expect(typename).to.eq(Type.getTypename(Organization));
  });

  test('serialize circular schema (TypeSchema)', () => {
    const jsonSchema = toJsonSchema(TypeSchema);
    expect(Object.keys(jsonSchema.properties!).length).toBeGreaterThan(0);

    // TODO(dmaretskyi): Currently unable to deserialize.
    // const effectSchema = toEffectSchema(jsonSchema);
    log('schema', { jsonSchema });
  });

  test('serialize a pair of mutually-recursive schemas (A embeds B, B embeds A)', () => {
    // Unlike a schema that's self-referential (caught by suspendCache within one expansion), a
    // *mutual* cycle across two distinct schemas isn't: each side starts a fresh suspendCache with
    // no memory of the other already being in flight, so without the `inProgress` guard this
    // recurses forever (A -> B -> A -> B -> ...).
    interface A {
      readonly kind: 'a';
      readonly b?: B;
    }
    interface B {
      readonly kind: 'b';
      readonly a?: A;
    }
    const A: Schema.Codec<A> = Schema.Struct({
      kind: Schema.Literal('a'),
      b: Schema.optional(Schema.suspend((): Schema.Codec<B> => B)),
    });
    const B: Schema.Codec<B> = Schema.Struct({
      kind: Schema.Literal('b'),
      a: Schema.optional(Schema.suspend((): Schema.Codec<A> => A)),
    });

    const jsonSchema = toJsonSchema(A);
    expect(jsonSchema.properties?.kind).toEqual({ type: 'string', enum: ['a'] });
    expect(jsonSchema.properties?.b).toBeDefined();
  });

  test('tuple schema with description', () => {
    const schema = Schema.Struct({
      args: Schema.Tuple([
        Schema.String.annotate({ description: 'The source currency' }),
        Schema.String.annotate({ description: 'The target currency' }),
      ]),
    });
    const jsonSchema = toJsonSchema(schema);
    log('schema', { jsonSchema });

    Schema.asserts(JsonSchemaType, jsonSchema);
  });

  test('reference with title annotation', () => {
    const schema = Schema.Struct({
      contact: Ref(TestSchema.Person).annotate({ title: 'Custom Title' }),
    });

    // log.info('schema before', { ast: schema.ast });

    const jsonSchema = toJsonSchema(schema);
    // log.info('json schema', { jsonSchema });

    const effectSchema = toEffectSchema(jsonSchema);
    // log.info('effect schema', { ast: effectSchema.ast });

    // `Schema.pluck` has no v4 replacement; the property is read off the AST directly.
    const contact = SchemaAST.getPropertySignatures(effectSchema.ast).find((property) => property.name === 'contact');
    expect(SchemaAST.getAnnotation(contact!.type, SchemaAST.TitleAnnotationId)).to.eq('Custom Title');
  });

  test('relation schema', () => {
    const schema = TestSchema.EmployedBy;
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: 'dxn:com.example.type.employedBy:0.1.0',
      $schema: 'http://json-schema.org/draft-07/schema#',
      entityKind: 'relation',
      typename: 'com.example.type.employedBy',
      version: '0.1.0',
      relationSource: {
        // TODO(dmaretskyi): Should those point to specific schema version?
        $ref: 'dxn:com.example.type.person',
      },
      relationTarget: {
        // TODO(dmaretskyi): Should those point to specific schema version?
        $ref: 'dxn:com.example.type.organization',
      },
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        role: {
          type: 'string',
        },
        since: {
          type: 'string',
        },
      },
      propertyOrder: ['role', 'since', 'id'],
      required: ['role', 'id'],
      additionalProperties: false,
    });
  });

  test('label prop', () => {
    const Organization = Schema.Struct({
      id: EntityId,
      name: Schema.String,
    }).pipe(LabelAnnotation.set(['name']), EchoObjectSchema(DXN.make('com.example.type.organization', '0.1.0')));

    const jsonSchema = toJsonSchema(Organization);
    expect(jsonSchema).toEqual({
      $id: 'dxn:com.example.type.organization:0.1.0',
      $schema: 'http://json-schema.org/draft-07/schema#',
      typename: 'com.example.type.organization',
      version: '0.1.0',
      entityKind: 'object',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          pattern: '^[0-7][0-9A-HJKMNP-TV-Z]{25}$',
          description: 'A Universally Unique Lexicographically Sortable Identifier',
        },
        name: {
          type: 'string',
        },
      },
      annotations: {
        labelProp: ['name'],
      },
      propertyOrder: ['id', 'name'],
      required: ['id', 'name'],
      additionalProperties: false,
    });
  });

  test('object id with description', () => {
    const schema = Schema.Struct({
      id: EntityId.annotate({ description: 'The id' }),
    });
    // log.info('schema', { schema: EntityId.ast });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "id": {
            "description": "The id",
            "pattern": "^[0-7][0-9A-HJKMNP-TV-Z]{25}$",
            "type": "string",
          },
        },
        "propertyOrder": [
          "id",
        ],
        "required": [
          "id",
        ],
        "type": "object",
      }
    `);
  });

  test('email schema', () => {
    const schema = Email;
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "Email address",
        "format": "email",
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        "title": "Email",
        "type": "string",
      }
    `);
    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(schema.ast));
  });

  const expectReferenceAnnotation = (object: JsonSchemaType) => {
    expect(object.reference).to.deep.eq({
      schema: {
        $ref: 'dxn:com.example.type.testNested',
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
      const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(
        Schema.Struct({
          field: Schema.String,
        }),
      );

      const fields = {
        string: Schema.String,
        number: Schema.Number.pipe(PropertyMeta(EXAMPLE_NAMESPACE, { is_date: true })),
        boolean: Schema.Boolean,
        array: Schema.Array(Schema.String),
        twoDArray: Schema.Array(Schema.Array(Schema.String)),
        record: Schema.Record(Schema.String, Schema.Number),
        object: Schema.Struct({ id: Schema.String, field: Ref(Organization) }),
        echoObject: Ref(Organization),
        echoObjectArray: Schema.Array(Ref(Organization)),
        email: Schema.String.pipe(FormatAnnotation.set(TypeFormat.Email)),
        null: Schema.Null,
      } as const;

      const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
        partial ? Schema.Struct(fields).mapFields(Struct.map(Schema.optional)) : Schema.Struct(fields),
      );

      const jsonSchema = toJsonSchema(Test);
      // log.info('schema', { jsonSchema });

      const schema = toEffectSchema(jsonSchema);

      const testAst = Type.getSchema(Test).ast;
      expect(() => expect(schema.ast).to.deep.eq(testAst)).to.throw();
      expect(() => expect(prepareAstForCompare(testAst)).to.deep.eq(testAst)).to.throw();
      expect(() => expect(schema.ast).to.deep.eq(prepareAstForCompare(testAst))).to.throw();
      // log.info('', { original: prepareAstForCompare(Schema.ast), deserialized: prepareAstForCompare(schema.ast) });
      expect(prepareAstForCompare(schema.ast)).to.deep.eq(prepareAstForCompare(testAst));

      // TODO(dmaretskyi): Fix.
      // expect(
      //   SchemaAST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'email')!.type.annotations[
      //     FormatAnnotationId
      //   ],
      // ).toEqual('email');
    });
  }

  test('legacy schema with echo.type annotation gets decoded', () => {
    const jsonSchema: JsonSchemaType = {
      $id: 'dxn:com.example.type.project',
      $schema: 'http://json-schema.org/draft-07/schema#',
      additionalProperties: false,
      echo: {
        type: {
          schemaId: '01JERV1HQCQZDQ4NVCJ42QB38F',
          typename: 'com.example.type.project',
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
      typename: 'com.example.type.project',
      version: '0.1.0',
    });
    expect(getTypeIdentifierAnnotation(schema)).to.deep.eq('echo:///01JERV1HQCQZDQ4NVCJ42QB38F');
  });

  test('symbol annotations get compared', () => {
    const schema1 = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Email));
    const schema2 = Schema.String.pipe(FormatAnnotation.set(TypeFormat.Currency));
    expect(prepareAstForCompare(schema1.ast)).not.to.deep.eq(prepareAstForCompare(schema2.ast));
  });

  test('description gets preserved', () => {
    const schema = Schema.Struct({
      name: Schema.String.annotate({ description: 'Name' }),
    });
    const jsonSchema = toJsonSchema(schema);
    const effectSchema = toEffectSchema(jsonSchema);
    const jsonSchema2 = toJsonSchema(effectSchema);
    expect(jsonSchema2.properties!.name.description).to.eq('Name');
  });

  test('relation schema roundtrip', () => {
    const schema = TestSchema.HasManager;
    const jsonSchema = toJsonSchema(schema);
    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(Type.getSchema(schema).ast));
  });

  test('generator annotation', () => {
    const schema = Schema.Struct({
      name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName')),
    });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "name": {
            "annotations": {
              "generator": "commerce.productName",
            },
            "type": "string",
          },
        },
        "propertyOrder": [
          "name",
        ],
        "required": [
          "name",
        ],
        "type": "object",
      }
    `);
  });

  // test('generator annotation on object', () => {
  //   const schema = Schema.Struct({
  //   });
  //   const jsonSchema = toJsonSchema(schema);
  //   expect(jsonSchema).toMatchInlineSnapshot();
  // });

  test('default annotation ', () => {
    const schema = Schema.Struct({
      str: Schema.String.annotate({
        default: 'foo',
      }),
      arr: Schema.Array(Schema.String).annotate({
        default: [],
      }),
      obj: Schema.Struct({
        foo: Schema.optional(Schema.String).annotate({
          default: 'bar',
        }),
      }),
    });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "arr": {
            "default": [],
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "obj": {
            "additionalProperties": false,
            "properties": {
              "foo": {
                "default": "bar",
                "type": "string",
              },
            },
            "propertyOrder": [
              "foo",
            ],
            "type": "object",
          },
          "str": {
            "default": "foo",
            "type": "string",
          },
        },
        "propertyOrder": [
          "str",
          "arr",
          "obj",
        ],
        "required": [
          "str",
          "arr",
          "obj",
        ],
        "type": "object",
      }
    `);
  });

  test('schema with optional referece', () => {
    const TempSchema = Schema.Struct({ contact: Schema.optional(Ref(TestSchema.Person)) });
    const jsonSchema = toJsonSchema(TempSchema);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "contact": {
            "$id": "/schemas/echo/ref",
            "$ref": "/schemas/echo/ref",
            "reference": {
              "schema": {
                "$ref": "dxn:com.example.type.person",
              },
              "schemaVersion": "0.1.0",
            },
          },
        },
        "propertyOrder": [
          "contact",
        ],
        "type": "object",
      }
    `);

    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(TempSchema.ast));
  });

  test('object nested inside another struct', () => {
    const Contact = Schema.Struct({
      name: Schema.String,
    }).pipe(EchoObjectSchema(DXN.make('com.example.type.person', '0.1.0')));
    const input = Schema.Struct({
      contact: Type.getSchema(Contact),
    });
    const jsonSchema = toJsonSchema(input);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "contact": {
            "$id": "dxn:com.example.type.person:0.1.0",
            "additionalProperties": false,
            "entityKind": "object",
            "properties": {
              "id": {
                "type": "string",
              },
              "name": {
                "type": "string",
              },
            },
            "propertyOrder": [
              "name",
              "id",
            ],
            "required": [
              "name",
              "id",
            ],
            "type": "object",
            "typename": "com.example.type.person",
            "version": "0.1.0",
          },
        },
        "propertyOrder": [
          "contact",
        ],
        "required": [
          "contact",
        ],
        "type": "object",
      }
    `);

    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(input.ast));
  });

  // An unconstrained value type serializes to the empty schema, so v4 emits no `additionalProperties`
  // and the document reads as a closed struct. Operations persist their input schema through this
  // round-trip (`Operation.serialize`), so losing it turned a property bag into a struct that accepts
  // nothing — and the re-emitted tool schema was rejected by the model provider outright.
  test('an open record survives the round-trip', ({ expect }) => {
    const input = Schema.Struct({ properties: Schema.Record(Schema.String, Schema.Any) });

    const jsonSchema = toJsonSchema(input);
    const serialized = jsonSchema.properties?.properties;
    expect(serialized?.additionalProperties).to.eq(true);

    // Lossless: re-serializing the decoded schema reproduces the document.
    expect(toJsonSchema(toEffectSchema(jsonSchema))).to.deep.eq(jsonSchema);

    // And the decoded schema still accepts arbitrary keys.
    const decoded = Schema.decodeUnknownSync(toEffectSchema(jsonSchema))({ properties: { any: 1, keys: 'ok' } });
    expect(decoded).to.deep.eq({ properties: { any: 1, keys: 'ok' } });
  });

  // The same v4 omission hits a struct's rest signature, where the round-trip silently dropped
  // every undeclared field (`addObject`'s draft kept only `@type`). The restore is unambiguous:
  // a closed struct always carries `additionalProperties: false` explicitly.
  test('a struct with an open rest signature survives the round-trip', ({ expect }) => {
    const input = Schema.Struct({
      draft: Schema.StructWithRest(Schema.Struct({ '@type': Schema.String }), [
        Schema.Record(Schema.String, Schema.Unknown),
      ]),
      closed: Schema.Struct({ name: Schema.String }),
    });

    const jsonSchema = toJsonSchema(input);
    expect(jsonSchema.properties?.draft?.additionalProperties).to.eq(true);
    expect(jsonSchema.properties?.closed?.additionalProperties).to.eq(false);

    // Lossless: re-serializing the decoded schema reproduces the document.
    expect(toJsonSchema(toEffectSchema(jsonSchema))).to.deep.eq(jsonSchema);

    // The undeclared fields survive decode; the closed struct still rejects them.
    const decoded = Schema.decodeUnknownSync(toEffectSchema(jsonSchema))({
      draft: { '@type': 'org.dxos.type.task', 'title': 'Fix the schema' },
      closed: { name: 'ok' },
    });
    expect(decoded).to.deep.eq({
      draft: { '@type': 'org.dxos.type.task', 'title': 'Fix the schema' },
      closed: { name: 'ok' },
    });
    const stripped = Schema.decodeUnknownSync(toEffectSchema(jsonSchema))({
      draft: { '@type': 'org.dxos.type.task' },
      closed: { name: 'ok', extra: 'stripped' },
    });
    expect((stripped as { closed: Record<string, unknown> }).closed).to.deep.eq({ name: 'ok' });
  });

  // A `$ref` is only ever emitted for a genuine cycle (an acyclic suspend is inlined), so the
  // decoder must reach every `$ref` through a suspend -- inlining the definition eagerly recurses
  // until the stack blows.
  test('decode a self-referential schema', () => {
    interface Node {
      readonly name: string;
      readonly child?: Node;
    }
    const Node: Schema.Codec<Node> = Schema.Struct({
      name: Schema.String,
      child: Schema.optional(Schema.suspend((): Schema.Codec<Node> => Node)),
    });

    const jsonSchema = toJsonSchema(Node);
    const decoded = toEffectSchema(jsonSchema);
    expect(Schema.decodeUnknownSync(decoded)({ name: 'root', child: { name: 'leaf' } })).to.deep.eq({
      name: 'root',
      child: { name: 'leaf' },
    });
  });

  test('decode a pair of mutually-recursive schemas', () => {
    interface A {
      readonly kind: 'a';
      readonly b?: B;
    }
    interface B {
      readonly kind: 'b';
      readonly a?: A;
    }
    const A: Schema.Codec<A> = Schema.Struct({
      kind: Schema.Literal('a'),
      b: Schema.optional(Schema.suspend((): Schema.Codec<B> => B)),
    });
    const B: Schema.Codec<B> = Schema.Struct({
      kind: Schema.Literal('b'),
      a: Schema.optional(Schema.suspend((): Schema.Codec<A> => A)),
    });

    const jsonSchema = toJsonSchema(A);
    const decoded = toEffectSchema(jsonSchema);
    expect(Schema.decodeUnknownSync(decoded)({ kind: 'a', b: { kind: 'b' } })).to.deep.eq({
      kind: 'a',
      b: { kind: 'b' },
    });
  });
});

describe('reference', () => {
  test('reference annotation', () => {
    const schema = Ref(TestSchema.Person);
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: '/schemas/echo/ref',
      $ref: '/schemas/echo/ref',
      $schema: 'http://json-schema.org/draft-07/schema#',
      reference: {
        schema: {
          $ref: 'dxn:com.example.type.person',
        },
        schemaVersion: '0.1.0',
      },
    });
  });

  test('title annotation', () => {
    const schema = Ref(TestSchema.Person).annotate({ title: 'My custom title' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: '/schemas/echo/ref',
      $ref: '/schemas/echo/ref',
      reference: {
        schema: {
          $ref: 'dxn:com.example.type.person',
        },
        schemaVersion: '0.1.0',
      },
      title: 'My custom title',
    });
  });

  test('description annotation', () => {
    const schema = Ref(TestSchema.Person).annotate({ description: 'My custom description' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: '/schemas/echo/ref',
      $ref: '/schemas/echo/ref',
      description: 'My custom description',
      reference: {
        schema: {
          $ref: 'dxn:com.example.type.person',
        },
        schemaVersion: '0.1.0',
      },
    });

    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(schema.ast));
  });

  test('serialize and deserialize', () => {
    const schema = Ref(TestSchema.Person);
    const jsonSchema = toJsonSchema(schema);
    const deserializedSchema = toEffectSchema(jsonSchema);
    const refAst = getReferenceAst(deserializedSchema.ast);
    expect(refAst).toEqual({
      typename: Type.getTypename(TestSchema.Person),
      version: Type.getVersion(TestSchema.Person),
    });
  });

  test('widened reference node still decodes as a reference', () => {
    // A wire boundary (e.g. the MCP tool-schema projection) may widen a reference with the
    // structural keywords so schema-unaware consumers see an object. Decoding must still match the
    // sentinel before the generic object branch, or the reference rebuilds as a plain struct.
    const widened = {
      $id: '/schemas/echo/ref',
      $ref: '/schemas/echo/ref',
      type: 'object',
      properties: { '/': { type: 'string' } },
      required: ['/'],
      reference: {
        schema: {
          $ref: 'dxn:com.example.type.person',
        },
        schemaVersion: '0.1.0',
      },
    } as JsonSchemaType;
    const deserializedSchema = toEffectSchema(widened);
    const refAst = getReferenceAst(deserializedSchema.ast);
    expect(refAst).toEqual({
      typename: Type.getTypename(TestSchema.Person),
      version: Type.getVersion(TestSchema.Person),
    });
  });

  test('empty struct round-trips as TypeLiteral', () => {
    const schema = Schema.Struct({});
    const jsonSchema = toJsonSchema(schema);
    const deserialized = toEffectSchema(jsonSchema);
    expect(deserialized.ast._tag).toBe('Objects');
  });
});
