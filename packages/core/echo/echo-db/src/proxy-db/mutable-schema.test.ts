//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  create,
  MutableSchema,
  ObjectAnnotationId,
  getSchema,
  getType,
  getTypeReference,
  ref,
  TypedObject,
  S,
} from '@dxos/echo-schema';
import { EmptySchemaType } from '@dxos/echo-schema/testing';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  schema: S.optional(ref(MutableSchema)),
}) {}

describe('MutableSchema', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('set MutableSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(TestSchema, {}));
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}

    instanceWithSchemaRef.schema = db.schema.addSchema(GeneratedSchema);
    const schemaWithId = GeneratedSchema.annotations({
      [ObjectAnnotationId]: {
        typename: 'example.com/type/Test',
        version: '0.1.0',
        schemaId: instanceWithSchemaRef.schema?.id,
      },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);

    const validator = S.validateSync(instanceWithSchemaRef.schema!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with MutableSchema', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}

    const schema = db.schema.addSchema(GeneratedSchema);
    const instanceWithSchemaRef = db.add(create(TestSchema, { schema }));
    expect(instanceWithSchemaRef.schema!.serializedSchema.typename).to.eq('example.com/type/Test');
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = db.schema.addSchema(EmptySchemaType);
    const object = create(schema, {});
    schema.addFields({ field1: S.String });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();
    expect(() => {
      object.field2 = false;
    }).to.throw();

    expect(getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(getType(object)?.objectId).to.be.eq(schema.id);

    db.add(object);
    const queried = (await db.query(Filter.schema(schema)).run()).objects;
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getTypeReference', async () => {
    const { db } = await setupTest();
    const schema = db.schema.addSchema(EmptySchemaType);
    expect(getTypeReference(schema)?.objectId).to.eq(schema.id);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema]);
    return { db };
  };
});
