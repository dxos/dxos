//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  composeSchema,
  create,
  createReferenceAnnotation,
  createStoredSchema,
  FormatAnnotationId,
  getTypename,
  ref,
  setAnnotation,
  setProperty,
  toJsonSchema,
  TypedObject,
  type JsonPath,
  type JsonSchemaType,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FieldFormatEnum, FieldPath, FILED_PATH_ANNOTATION } from './annotations';
import { FieldProjection } from './field';
import { createView, ViewSchema, type ViewType } from './view';

describe('view', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      email: S.String.pipe(FieldPath('$.email' as JsonPath)).annotations({
        [FormatAnnotationId]: FieldFormatEnum.Email,
      }),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema as any, overlaySchema as any);

    // TODO(burdon): Remove any cast?
    expect((composedSchema as any).properties).toEqual({
      email: {
        type: 'string',
        format: FieldFormatEnum.Email,
        echo: {
          annotations: {
            [FILED_PATH_ANNOTATION]: '$.email',
          },
        },
      },
    });
  });

  test('static schema definitions with references', async ({ expect }) => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.annotations({ [FormatAnnotationId]: FieldFormatEnum.Email }),
      org: ref(Org),
    }) {}

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });
    log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    log('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });

  test('dynamic schema definitions with references', async () => {
    const orgSchema = createStoredSchema('example.com/type/Org', '0.1.0');
    setProperty(
      orgSchema.jsonSchema as any,
      'name',
      S.String.annotations({ [AST.DescriptionAnnotationId]: 'Org name' }),
    );

    const personSchema = createStoredSchema('example.com/type/Person', '0.1.0');
    setProperty(
      personSchema.jsonSchema as any,
      'name',
      S.String.annotations({
        [AST.TitleAnnotationId]: 'Name',
        [AST.DescriptionAnnotationId]: 'Full name',
      }),
    );

    setProperty(
      personSchema.jsonSchema as any,
      'email',
      S.String.annotations({
        [AST.DescriptionAnnotationId]: 'Primary email',
        [FormatAnnotationId]: FieldFormatEnum.Email,
      }),
    );

    setProperty(
      personSchema.jsonSchema as any,
      'org',
      createReferenceAnnotation(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
    );

    const personView = create(ViewSchema, {
      schema: personSchema.jsonSchema,
      query: {
        __typename: personSchema.typename,
      },
      fields: [
        {
          property: 'name',
        },
        {
          property: 'email',
        },
        {
          property: 'org',
        },
      ],
    });

    log.info('schema', { org: orgSchema, person: personSchema });
    log('view', { person: personView });
  });

  test('adds property to schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({}) {}
    const schema = db.schema.addSchema(TestSchema);

    const view: ViewType = {
      schema: toJsonSchema(TestSchema),
      query: {
        __typename: schema.typename,
      },
      fields: [],
    };

    expect(view.query.__typename).to.eq(TestSchema.typename);
  });

  test('adds dynamic schema to registry', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema('example.com/type/Org', '0.1.0');
    db.add(schema);

    // TODO(burdon): Should registration be automatic?
    // TODO(burdon): Mutable? or property on StoredSchema?
    const mutable = registry.registerSchema(schema);
    expect(await registry.list()).to.have.length(1);
    const before = mutable.schema.ast.toJSON();

    const jsonSchema = schema.jsonSchema;
    setProperty(jsonSchema as any, 'name', S.String);
    setAnnotation(jsonSchema as any, 'name', { [AST.TitleAnnotationId]: 'Name' });

    // Check schema updated.
    expect(before).not.to.deep.eq(mutable.schema.ast.toJSON());

    // TODO(burdon): Throws.
    const projection = new FieldProjection();
    const view = createView(schema);
    const properties = projection.getFieldProperties(schema, view, 'name');
    expect(properties).to.exist;
  });

  test('projection', async ({ expect }) => {
    const projection = new FieldProjection();

    //
    // Object type.
    //

    const schema = createStoredSchema('example.com/type/Org', '0.1.0');
    setProperty(schema.jsonSchema as any, 'name', S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }));
    setProperty(schema.jsonSchema as any, 'email', PROPERTY_TYPES[FieldFormatEnum.Email]!);

    //
    // View.
    //

    const view = createView(schema);
    expect(view.fields).to.have.length(2);

    // Update email column size.
    projection.setField(view, { property: 'email', size: 100 });

    const [fieldProps, propertySchema] = projection.getFieldProperties(schema, view, 'name');
    expect(fieldProps).toEqual({
      property: 'name',
    });
    expect(propertySchema).toEqual({
      type: 'string',
      title: 'Name',
    });

    const [emailProps, emailSchema] = projection.getFieldProperties(schema, view, 'email');
    expect(emailProps).toEqual({
      property: 'email',
      size: 100,
    });
    expect(emailSchema).toEqual({
      type: 'string',
      description: 'Email address',
      pattern: 'xxxxxxxx',
      format: 'email',
    });
    expect(propertySchemaToFieldFormat(emailSchema)).to.eq(FieldFormatEnum.Email);
  });
});

const PROPERTY_TYPES: Partial<Record<FieldFormatEnum, S.Schema.All>> = {
  // NOTE: pattern must come first so that it does not override description annotation.
  [FieldFormatEnum.Email]: S.String.pipe(S.pattern(/xxxxxxxx/)).pipe(
    S.annotations({ [AST.DescriptionAnnotationId]: 'Email address', [FormatAnnotationId]: 'email' }),
  ),

  [FieldFormatEnum.Currency]: S.String.pipe(
    S.annotations({
      [AST.DescriptionAnnotationId]: 'Currency value',
      [FormatAnnotationId]: 'currency',
      [AST.JSONSchemaAnnotationId]: { multipleOf: 0.01 }, // TODO(dmaretskyi): Might not work currently.
    }),
  ),
};

const propertySchemaToFieldFormat = (propertySchema: JsonSchemaType): FieldFormatEnum | undefined => {
  const format = propertySchema.format;

  // TODO(dmaretskyi): map .
  switch (format) {
    case 'email':
      return FieldFormatEnum.Email;
    default:
      return undefined;
  }
};
