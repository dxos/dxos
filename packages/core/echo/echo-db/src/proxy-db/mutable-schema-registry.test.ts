//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  AST,
  makeStaticSchema,
  MutableSchema,
  type ObjectAnnotation,
  ObjectAnnotationId,
  S,
  StoredSchema,
  toEffectSchema,
  toJsonSchema,
  TypedObject,
} from '@dxos/echo-schema';
import { TestSchemaType } from '@dxos/echo-schema/testing';
import { create } from '@dxos/live-object';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

const meta: ObjectAnnotation = { typename: 'example.com/type/Test', version: '0.1.0' };
const SCHEMA_1 = S.Struct({ field: S.String }).annotations({
  [ObjectAnnotationId]: { ...meta },
});
const SCHEMA_2 = S.Struct({ field: S.Number }).annotations({
  [ObjectAnnotationId]: { ...meta, typename: meta.typename + '2' },
});

const createTestSchemas = () => [
  create(StoredSchema, {
    ...meta,
    jsonSchema: toJsonSchema(SCHEMA_1),
  }),
  create(StoredSchema, {
    ...meta,
    typename: meta.typename + '2',
    jsonSchema: toJsonSchema(SCHEMA_2),
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
    return { db, registry: db.schemaRegistry };
  };

  test('add new schema', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(meta)({}) {}
    const [schemaRecord] = await registry.register([{ schema: TestClass }]);
    const expectedSchema = TestClass.annotations({
      [ObjectAnnotationId]: { ...meta, schemaId: (await schemaRecord.getBackingObject())?.id },
    });
    expect(schemaRecord.getSchema().ast).to.deep.eq(expectedSchema.ast);
    const result = await registry.query().run();
    expect(result).to.eq([schemaRecord]);
  });

  test('can store the same schema multiple times', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(meta)({}) {}
    const stored1 = registry.addSchema(TestClass);
    const stored2 = registry.addSchema(TestClass);
    expect(stored1.id).to.not.equal(stored2.id);
  });

  test('get all dynamic schemas', async () => {
    const { db, registry } = await setupTest();
    const schemas = [SCHEMA_1, SCHEMA_2].map((s) => db.schemaRegistry.addSchema(s));
    await db.flush({ indexes: true });
    const retrieved = await registry.query().run();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      const id = (await schema.getBackingObject())?.id;
      expect(schemas.find((s) => s.id === id)).not.to.undefined;
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
      ...meta,
      jsonSchema: toJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(registry.query({ typename: meta.typename }).runSync().length).to.eq(0);
    const storedSchema = db.add(schemaToStore);
    expect(registry.query({ typename: meta.typename }).runSync().length).to.eq(1);
  });

  test("can't register schema if not stored in db", async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredSchema, {
      ...meta,
      jsonSchema: toJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(() => registry.registerSchema(schemaToStore)).to.throw();
    db.add(schemaToStore);
    expect(registry.registerSchema(schemaToStore)).not.to.be.undefined;
  });

  test('schema is invalidated on update', async () => {
    const { db, registry } = await setupTest();
    const [schemaRecord] = await registry.register([{ schema: SCHEMA_1 }]);
    expect(AST.getPropertySignatures(schemaRecord.getSchema().ast).length).to.eq(1);
    schemaRecord.addFields({ newField: S.Number });
    expect(AST.getPropertySignatures(schemaRecord.getSchema().ast).length).to.eq(2);
  });

  test('list returns static and dynamic schemas', async () => {
    const { db, registry } = await setupTest();
    const storedSchema = db.add(createTestSchemas()[0]);
    db.graph.schemaRegistry.addSchema([TestSchemaType]);
    const listed = await db.schemaRegistry.query().run();
    expect(listed.length).to.eq(3);
    expect(listed.slice(0, 2)).to.deep.eq([makeStaticSchema(StoredSchema), makeStaticSchema(TestSchemaType)]);
    expect(listed[2]).to.deep.contain({
      id: storedSchema.id,
      typename: storedSchema.typename,
      version: storedSchema.version,
    });
    const [schemaRecord] = registry.query({ backingObjectId: storedSchema.id }).runSync();
    expect(listed[2].getSchema().ast).to.deep.eq(schemaRecord.getSchema().ast);
  });
});
