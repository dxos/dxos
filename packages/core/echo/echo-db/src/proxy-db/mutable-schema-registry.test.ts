//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  create,
  MutableSchema,
  type ObjectAnnotation,
  ObjectAnnotationId,
  effectToJsonSchema,
  makeStaticSchema,
  StoredSchema,
  TypedObject,
} from '@dxos/echo-schema';
import { S } from '@dxos/echo-schema';
import { TestSchemaType } from '@dxos/echo-schema/testing';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

const TestType: ObjectAnnotation = { typename: 'TestType', version: '1.0.0' };
const createTestSchemas = () => [
  create(StoredSchema, {
    ...TestType,
    jsonSchema: effectToJsonSchema(S.Struct({ field: S.String })),
  }),
  create(StoredSchema, {
    ...TestType,
    typename: TestType.typename + '2',
    jsonSchema: effectToJsonSchema(S.Struct({ field: S.Number })),
  }),
];

describe('schema registry', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setupTest = async () => {
    const { db } = await builder.createDatabase();
    return { db, registry: db.schema };
  };

  test('add new schema', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(TestType)({}) {}
    const mutableSchema = registry.addSchema(TestClass);
    const expectedSchema = TestClass.annotations({
      [ObjectAnnotationId]: { ...TestType, schemaId: mutableSchema.id },
    });
    console.log(mutableSchema.ast);
    console.log(expectedSchema.ast);
    expect(mutableSchema.ast).to.deep.eq(expectedSchema.ast);
    expect(registry.hasSchema(mutableSchema)).to.be.true;
    expect(registry.getSchemaById(mutableSchema.id)?.ast).to.deep.eq(expectedSchema.ast);
  });

  test('can store the same schema multiple times', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(TestType)({}) {}
    const stored1 = registry.addSchema(TestClass);
    const stored2 = registry.addSchema(TestClass);
    expect(stored1.id).to.not.equal(stored2.id);
  });

  test('get all dynamic schemas', async () => {
    const { db, registry } = await setupTest();
    const schemas = createTestSchemas().map((s) => db.add(s));
    const retrieved = await registry.list();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('get all raw stored schemas', async () => {
    const { db } = await setupTest();
    const schemas = createTestSchemas().map((s) => db.add(s));
    const retrieved = (await db.query(Filter.schema(StoredSchema)).run()).objects;
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('is registered if was stored in db', async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredSchema, {
      ...TestType,
      jsonSchema: effectToJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(registry.hasSchema(new MutableSchema(schemaToStore))).to.be.false;
    const storedSchema = db.add(schemaToStore);
    expect(registry.hasSchema(new MutableSchema(storedSchema))).to.be.true;
  });

  test("can't register schema if not stored in db", async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredSchema, {
      ...TestType,
      jsonSchema: effectToJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(() => registry.registerSchema(schemaToStore)).to.throw();
    db.add(schemaToStore);
    expect(registry.registerSchema(schemaToStore)).not.to.be.undefined;
  });

  test('schema is invalidated on update', async () => {
    const { db, registry } = await setupTest();
    const storedSchema = db.add(createTestSchemas()[0]);
    const mutableSchema = registry.getSchemaById(storedSchema.id)!;
    expect(mutableSchema.getProperties().length).to.eq(1);
    mutableSchema.addColumns({ newField: S.Number });
    expect(mutableSchema.getProperties().length).to.eq(2);
  });

  test('list returns static and dynamic schemas', async () => {
    const { db, registry } = await setupTest();
    const storedSchema = db.add(createTestSchemas()[0]);
    db.graph.schemaRegistry.addSchema([TestSchemaType]);
    const listed = await db.schema.listAll();
    expect(listed.length).to.eq(3);
    expect(listed.slice(0, 2)).to.deep.eq([makeStaticSchema(StoredSchema), makeStaticSchema(TestSchemaType)]);
    expect(listed[2]).to.deep.contain({
      id: storedSchema.id,
      typename: storedSchema.typename,
      version: storedSchema.version,
    });
    const mutableSchema = registry.getSchemaById(storedSchema.id)!;
    expect(listed[2].schema.ast).to.deep.eq(mutableSchema.schema.ast);
  });
});