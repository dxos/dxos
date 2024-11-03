//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  FormatEnum,
  Format,
  FormatAnnotationId,
  TypedObject,
  create,
  createReferenceAnnotation,
  createStoredSchema,
  getTypename,
  ref,
  setAnnotation,
  setProperty,
  toJsonSchema,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FieldProjection } from './field';
import { createView } from './view';

describe('view', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('static schema definitions with references', async ({ expect }) => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.annotations({ [FormatAnnotationId]: FormatEnum.Email }),
      org: ref(Org),
    }) {}

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });
    log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    log('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });

  test('create view from TypedObject', async ({ expect }) => {
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({}) {}
    const view = createView(toJsonSchema(TestSchema), TestSchema.typename);
    expect(view.query.__typename).to.eq(TestSchema.typename);
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
        [FormatAnnotationId]: FormatEnum.Email,
      }),
    );

    setProperty(
      personSchema.jsonSchema as any,
      'org',
      createReferenceAnnotation(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
    );

    const personView = createView(personSchema.jsonSchema, personSchema.typename);
    log('schema', { org: orgSchema, person: personSchema });
    log('view', { person: personView });
  });

  test('adds dynamic schema to registry', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema('example.com/type/Org', '0.1.0');
    db.add(schema);

    // TODO(burdon): Should registration be automatic?
    const mutable = registry.registerSchema(schema);
    expect(await registry.list()).to.have.length(1);
    const before = mutable.schema.ast.toJSON();

    const jsonSchema = schema.jsonSchema;
    setProperty(jsonSchema as any, 'name', S.String);
    setAnnotation(jsonSchema as any, 'name', { [AST.TitleAnnotationId]: 'Name' });

    // Check schema updated.
    expect(before).not.to.deep.eq(mutable.schema.ast.toJSON());

    const projection = new FieldProjection();
    const view = createView(jsonSchema, schema.typename);
    const properties = projection.getFieldProperties(schema, view, 'name');
    expect(properties).to.exist;
  });

  test('projection', async ({ expect }) => {
    const projection = new FieldProjection();

    const schema = createStoredSchema('example.com/type/Person', '0.1.0');
    setProperty(schema.jsonSchema as any, 'name', S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }));
    setProperty(schema.jsonSchema as any, 'email', Format.Email);
    setProperty(schema.jsonSchema as any, 'salary', Format.Currency({ code: 'usd', decimals: 2 }));

    const view = createView(schema.jsonSchema, schema.typename);
    expect(view.fields).to.have.length(3);
    projection.setField(view, { property: 'email', size: 100 });

    {
      const [field, props] = projection.getFieldProperties(schema, view, 'name');
      expect(field).to.deep.eq({ property: 'name' });
      expect(props).to.deep.eq({ type: 'string', title: 'Name' });
    }

    {
      const [field, props] = projection.getFieldProperties(schema, view, 'email');
      expect(field).to.deep.eq({ property: 'email', size: 100 });
      expect(props).to.include({ type: 'string', format: 'email' });
    }

    {
      const [field, props] = projection.getFieldProperties(schema, view, 'salary');
      expect(field).to.deep.eq({ property: 'salary' });
      expect(props).to.include({ type: 'number', format: 'currency', currency: 'USD', multipleOf: 0.01 });
    }

    // TODO(dmaretskyi): References.
    // if (false) {
    //   const [orgProps, orgSchema] = projection.getFieldProperties(schema, view, 'org');
    //   expect(orgProps).toEqual({
    //     projection: 'org',
    //     referenceProperty: 'name',
    //   });
    //   expect(orgSchema).toEqual({
    //     $id: '/echo/ref',
    //     reference: {
    //       schema: {
    //         $ref: 'dxn:type:example.com/type/Org', // Same as $id of the org schema.
    //       },
    //       schemaVersion: '0.1.0',
    //       schemaObject: 'dnx:echo:@:XXXXXXXXX', // Temp.
    //     },
    //   });
    // }
  });
});
