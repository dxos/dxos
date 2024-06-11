//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import {
  create,
  getSchema,
  getType,
  getTypeReference,
  ref,
  DynamicSchema,
  EchoObjectAnnotationId,
  TypedObject,
} from '@dxos/echo-schema';
import { GeneratedEmptySchema, TEST_SCHEMA_TYPE } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

import { Filter } from './query';
import { EchoTestBuilder } from './testing';

class ClassWithSchemaField extends TypedObject(TEST_SCHEMA_TYPE)({
  schema: S.optional(ref(DynamicSchema)),
}) {}

describe('DynamicSchema', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('set DynamicSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, {}));
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({
      field: S.String,
    }) {}

    instanceWithSchemaRef.schema = db.schema.addSchema(GeneratedSchema);
    const schemaWithId = GeneratedSchema.annotations({
      [EchoObjectAnnotationId]: { ...TEST_SCHEMA_TYPE, storedSchemaId: instanceWithSchemaRef.schema?.id },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);

    const validator = S.validateSync(instanceWithSchemaRef.schema!);
    expect(() => validator({ id: instanceWithSchemaRef.id, field: '1' })).not.to.throw();
    expect(() => validator({ id: instanceWithSchemaRef.id, field: 1 })).to.throw();
  });

  test('create echo object with DynamicSchema', async () => {
    const { db } = await setupTest();
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.String }) {}
    const schema = db.schema.addSchema(GeneratedSchema);
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, { schema }));

    const schemaWithId = GeneratedSchema.annotations({
      [EchoObjectAnnotationId]: { ...TEST_SCHEMA_TYPE, storedSchemaId: instanceWithSchemaRef.schema?.id },
    });
    expect(instanceWithSchemaRef.schema?.ast).to.deep.eq(schemaWithId.ast);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = db.schema.addSchema(GeneratedEmptySchema);
    const object = create(schema, {});
    schema.addColumns({ field1: S.String });
    object.field1 = 'works';
    object.field1 = undefined;
    expect(() => {
      object.field1 = 42;
    }).to.throw();
    expect(() => {
      object.field2 = false;
    }).to.throw();

    expect(getSchema(object)?.ast).to.deep.eq(schema.ast);
    expect(getType(object)?.itemId).to.be.eq(schema.id);

    db.add(object);
    const queried = (await db.query(Filter.schema(schema)).run()).objects;
    expect(queried.length).to.eq(1);
    expect(queried[0].id).to.eq(object.id);
  });

  test('getTypeReference', async () => {
    const { db } = await setupTest();
    const schema = db.schema.addSchema(GeneratedEmptySchema);
    expect(getTypeReference(schema)?.itemId).to.eq(schema.id);
  });

  const setupTest = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema(ClassWithSchemaField);
    return { db };
  };
});
