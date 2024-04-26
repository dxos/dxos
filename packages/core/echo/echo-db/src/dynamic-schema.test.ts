//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import {
  create,
  DynamicEchoSchema,
  EchoObjectAnnotationId,
  getSchema,
  getType,
  getTypeReference,
  ref,
  TypedObject,
} from '@dxos/echo-schema';
import { GeneratedEmptySchema, TEST_SCHEMA_TYPE } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

import { Filter } from './query';
import { createDatabase } from './testing';

class ClassWithSchemaField extends TypedObject(TEST_SCHEMA_TYPE)({
  schema: S.optional(ref(DynamicEchoSchema)),
}) {}

describe('DynamicSchema', () => {
  test('set DynamicSchema as echo object field', async () => {
    const { db } = await setupTest();
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, {}));
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({
      field: S.string,
    }) {}

    instanceWithSchemaRef.schema = db.schemaRegistry.add(GeneratedSchema);
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
    class GeneratedSchema extends TypedObject(TEST_SCHEMA_TYPE)({ field: S.string }) {}
    const schema = db.schemaRegistry.add(GeneratedSchema);
    const instanceWithSchemaRef = db.add(create(ClassWithSchemaField, { schema }));
    expect(instanceWithSchemaRef.schema!.serializedSchema.typename).to.eq(TEST_SCHEMA_TYPE.typename);
  });

  test('can be used to create objects', async () => {
    const { db } = await setupTest();
    const schema = db.schemaRegistry.add(GeneratedEmptySchema);
    const object = create(schema, {});
    schema.addColumns({ field1: S.string });
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
    const schema = db.schemaRegistry.add(GeneratedEmptySchema);
    expect(getTypeReference(schema)?.itemId).to.eq(schema.id);
  });

  const setupTest = async () => {
    const { db, graph } = await createDatabase();
    graph.runtimeSchemaRegistry.registerSchema(ClassWithSchemaField);
    return { db };
  };
});
