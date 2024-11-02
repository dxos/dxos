//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { AST, S, createStoredSchema, setAnnotation, setProperty, toJsonSchema, TypedObject } from '@dxos/echo-schema';

import { type ViewType } from './view';

describe('view', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
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

  test('adds dynamic schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);
    const schema = createStoredSchema('example.com/type/Org', '0.1.0');
    db.add(schema);
    const mutable = registry.registerSchema(schema);
    expect(await registry.list()).to.have.length(1);
    const before = mutable.schema.ast.toJSON();

    const jsonSchema = schema.jsonSchema;
    setProperty(jsonSchema, 'name', S.String);
    setAnnotation(jsonSchema, 'name', { [AST.TitleAnnotationId]: 'Name' });

    // Check schema updated.
    expect(before).not.to.deep.eq(mutable.schema.ast.toJSON());
  });
});
