//
// Copyright 2022 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { type JsonProp, findAnnotation } from '@dxos/effect';
import { ObjectId } from '@dxos/keys';
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
} from '../annotations';
import { EchoObjectSchema } from '../entities';
import { Email, FormatAnnotation, FormatEnum } from '../formats';
import { JsonSchemaType, getNormalizedEchoAnnotations, getSchemaProperty, setSchemaProperty } from '../json-schema';
import { Ref, createSchemaReference, getReferenceAst, getSchemaReference } from '../ref';
import { StoredSchema } from '../schema';
import { EntityKind } from '../types';

import { toEffectSchema, toJsonSchema } from './json-schema';

const EXAMPLE_NAMESPACE = '@example';

describe('effect-to-json', () => {
  test('type annotation', () => {
    const Test = Schema.Struct({ name: Schema.String }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    expect((jsonSchema as any).$id).toEqual('dxn:type:example.com/type/Test');
    expect((jsonSchema as any).version).toEqual('0.1.0');
  });

  test('property meta annotation', () => {
    const meta = { maxLength: 0 };
    const Test = Schema.Struct({
      name: Schema.String.pipe(PropertyMeta(EXAMPLE_NAMESPACE, meta)),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    expect(getNormalizedEchoAnnotations(jsonSchema.properties!.name!)!.meta![EXAMPLE_NAMESPACE]).to.deep.eq(meta);
  });

  test('reference annotation', () => {
    const Nested = Schema.Struct({
      name: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/TestNested',
        version: '0.1.0',
      }),
    );
    const Test = Schema.Struct({
      name: Ref(Nested),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
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
    const Nested = Schema.Struct({
      name: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/TestNested',
        version: '0.1.0',
      }),
    );
    const Test = Schema.Struct({
      name: Ref(Nested).annotations({ [FieldLookupAnnotationId]: 'name' }),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
      }),
    );
    const jsonSchema = toJsonSchema(Test);
    const effectSchema = toEffectSchema(jsonSchema);

    const annotation = findAnnotation<string>(effectSchema.ast, FieldLookupAnnotationId);
    expect(annotation).to.not.toBeUndefined();
  });

  test('array of references', () => {
    const Nested = Schema.Struct({
      name: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/TestNested',
        version: '0.1.0',
      }),
    );
    const Test = Schema.Struct({
      name: Schema.Array(Ref(Nested)),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
      }),
    );

    const jsonSchema = toJsonSchema(Test);
    expectReferenceAnnotation((jsonSchema.properties!.name as any).items);
  });

  test('optional references', () => {
    const Nested = Schema.Struct({
      name: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/TestNested',
        version: '0.1.0',
      }),
    );
    const Test = Schema.Struct({
      name: Schema.optional(Ref(Nested)),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Test',
        version: '0.1.0',
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
    const TempSchema = Schema.Struct({
      name: Schema.String.annotations({ description: 'Person name', title: 'Name' }),
      email: Schema.String.pipe(FormatAnnotation.set(FormatEnum.Email)).annotations({
        description: 'Email address',
      }),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Person',
        version: '0.1.0',
      }),
    );

    const jsonSchema = toJsonSchema(TempSchema);
    expect(jsonSchema).to.deep.eq({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:type:example.com/type/Person',

      entityKind: EntityKind.Object,
      typename: 'example.com/type/Person',
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
      'tasks',
      'employer',
      'address',
    ]);
  });

  test('reference property by ref', () => {
    const Organization = Schema.Struct({
      field: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Organization',
        version: '0.1.0',
      }),
    );

    const Contact = Schema.Struct({
      name: Schema.String,
      organization: Ref(Organization).annotations({ description: 'Contact organization' }),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Person',
        version: '0.1.0',
      }),
    );

    // log.info('Contact', { ast: Contact.ast });

    const jsonSchema = toJsonSchema(Contact);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'dxn:type:example.com/type/Person',

      entityKind: EntityKind.Object,
      typename: 'example.com/type/Person',
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
          allOf: [
            {
              $id: '/schemas/echo/ref',
              $ref: '/schemas/echo/ref',
              reference: {
                schema: {
                  $ref: 'dxn:type:example.com/type/Organization',
                },
                schemaVersion: '0.1.0',
              },
            },
          ],
          description: 'Contact organization',
        },
      },
      required: ['name', 'organization', 'id'],
      propertyOrder: ['name', 'organization', 'id'],
    });
  });

  test('add reference property', () => {
    const Organization = Schema.Struct({
      field: Schema.String,
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Organization',
        version: '0.1.0',
      }),
    );

    const Contact = Schema.Struct({
      name: Schema.String,
      organization: Ref(Organization).annotations({ description: 'Contact organization' }),
    }).pipe(
      Type.Obj({
        typename: 'example.com/type/Person',
        version: '0.1.0',
      }),
    );

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
    const schema = Schema.Struct({
      args: Schema.Tuple(
        Schema.String.annotations({ description: 'The source currency' }),
        Schema.String.annotations({ description: 'The target currency' }),
      ),
    });
    const jsonSchema = toJsonSchema(schema);
    log('schema', { jsonSchema });

    (Schema.asserts(JsonSchemaType) as any)(jsonSchema);
  });

  test('reference with title annotation', () => {
    const schema = Schema.Struct({
      contact: Ref(TestSchema.Person).annotations({ title: 'Custom Title' }),
    });

    // log.info('schema before', { ast: schema.ast });

    const jsonSchema = toJsonSchema(schema);
    // log.info('json schema', { jsonSchema });

    const effectSchema = toEffectSchema(jsonSchema);
    // log.info('effect schema', { ast: effectSchema.ast });

    expect(
      effectSchema.pipe(
        Schema.pluck('contact'),
        Schema.typeSchema,
        (s) => s.ast,
        SchemaAST.getAnnotation(SchemaAST.TitleAnnotationId),
        Option.getOrUndefined,
      ),
    ).to.eq('Custom Title');
  });

  test('relation schema', () => {
    const schema = TestSchema.EmployedBy;
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $id: 'dxn:type:example.com/type/EmployedBy',
      $schema: 'http://json-schema.org/draft-07/schema#',
      entityKind: 'relation',
      typename: 'example.com/type/EmployedBy',
      version: '0.1.0',
      relationSource: {
        // TODO(dmaretskyi): Should those point to specific schema version?
        $ref: 'dxn:type:example.com/type/Person',
      },
      relationTarget: {
        // TODO(dmaretskyi): Should those point to specific schema version?
        $ref: 'dxn:type:example.com/type/Organization',
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
      id: ObjectId,
      name: Schema.String,
    }).pipe(
      EchoObjectSchema({
        typename: 'example.com/type/Organization',
        version: '0.1.0',
      }),
      LabelAnnotation.set(['name']),
    );

    const jsonSchema = toJsonSchema(Organization);
    expect(jsonSchema).toEqual({
      $id: 'dxn:type:example.com/type/Organization',
      $schema: 'http://json-schema.org/draft-07/schema#',
      typename: 'example.com/type/Organization',
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
      id: ObjectId.annotations({ description: 'The id' }),
    });
    // log.info('schema', { schema: ObjectId.ast });
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
      const Organization = Schema.Struct({
        field: Schema.String,
      }).pipe(
        Type.Obj({
          typename: 'example.com/type/Organization',
          version: '0.1.0',
        }),
      );

      const fields = {
        string: Schema.String,
        number: Schema.Number.pipe(PropertyMeta(EXAMPLE_NAMESPACE, { is_date: true })),
        boolean: Schema.Boolean,
        array: Schema.Array(Schema.String),
        twoDArray: Schema.Array(Schema.Array(Schema.String)),
        record: Schema.Record({ key: Schema.String, value: Schema.Number }),
        object: Schema.Struct({ id: Schema.String, field: Ref(Organization) }),
        echoObject: Ref(Organization),
        echoObjectArray: Schema.Array(Ref(Organization)),
        email: Schema.String.pipe(FormatAnnotation.set(FormatEnum.Email)),
        null: Schema.Null,
      } as const;

      const Test = (partial ? Schema.partial(Schema.Struct(fields)) : Schema.Struct(fields)).pipe(
        Type.Obj({
          typename: 'example.com/type/Test',
          version: '0.1.0',
        }),
      );

      const jsonSchema = toJsonSchema(Test);
      // log.info('schema', { jsonSchema });

      const schema = toEffectSchema(jsonSchema);

      expect(() => expect(schema.ast).to.deep.eq(Test.ast)).to.throw();
      expect(() => expect(prepareAstForCompare(Test.ast)).to.deep.eq(Test.ast)).to.throw();
      expect(() => expect(schema.ast).to.deep.eq(prepareAstForCompare(Test.ast))).to.throw();
      // log.info('', { original: prepareAstForCompare(Schema.ast), deserialized: prepareAstForCompare(schema.ast) });
      expect(prepareAstForCompare(schema.ast)).to.deep.eq(prepareAstForCompare(Test.ast));

      // TODO(dmaretskyi): Fix.
      // expect(
      //   SchemaAST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'email')!.type.annotations[
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
    const schema1 = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Email));
    const schema2 = Schema.String.pipe(FormatAnnotation.set(FormatEnum.Currency));
    expect(prepareAstForCompare(schema1.ast)).not.to.deep.eq(prepareAstForCompare(schema2.ast));
  });

  test('description gets preserved', () => {
    const schema = Schema.Struct({
      name: Schema.String.annotations({ description: 'Name' }),
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
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(schema.ast));
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
      str: Schema.String.annotations({
        default: 'foo',
      }),
      arr: Schema.Array(Schema.String).annotations({
        default: [],
      }),
      obj: Schema.Struct({
        foo: Schema.optional(Schema.String).annotations({
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
            "required": [],
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
                "$ref": "dxn:type:example.com/type/Person",
              },
              "schemaVersion": "0.1.0",
            },
          },
        },
        "propertyOrder": [
          "contact",
        ],
        "required": [],
        "type": "object",
      }
    `);

    const effectSchema = toEffectSchema(jsonSchema);
    expect(prepareAstForCompare(effectSchema.ast)).to.deep.eq(prepareAstForCompare(TempSchema.ast));
  });

  test('object nested inside another struct', () => {
    const Contact = Schema.Struct({
      name: Schema.String,
    }).pipe(EchoObjectSchema({ typename: 'example.com/type/Person', version: '0.1.0' }));
    const input = Schema.Struct({
      contact: Contact,
    });
    const jsonSchema = toJsonSchema(input);
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "contact": {
            "$id": "dxn:type:example.com/type/Person",
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
            "typename": "example.com/type/Person",
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
          $ref: 'dxn:type:example.com/type/Person',
        },
        schemaVersion: '0.1.0',
      },
    });
  });

  test('title annotation', () => {
    const schema = Ref(TestSchema.Person).annotations({ title: 'My custom title' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      allOf: [
        {
          $id: '/schemas/echo/ref',
          $ref: '/schemas/echo/ref',
          reference: {
            schema: {
              $ref: 'dxn:type:example.com/type/Person',
            },
            schemaVersion: '0.1.0',
          },
        },
      ],
      title: 'My custom title',
    });
  });

  test('description annotation', () => {
    const schema = Ref(TestSchema.Person).annotations({ description: 'My custom description' });
    const jsonSchema = toJsonSchema(schema);
    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      allOf: [
        {
          $id: '/schemas/echo/ref',
          $ref: '/schemas/echo/ref',
          reference: {
            schema: {
              $ref: 'dxn:type:example.com/type/Person',
            },
            schemaVersion: '0.1.0',
          },
        },
      ],
      description: 'My custom description',
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
      typename: TestSchema.Person.typename,
      version: TestSchema.Person.version,
    });
  });
});
