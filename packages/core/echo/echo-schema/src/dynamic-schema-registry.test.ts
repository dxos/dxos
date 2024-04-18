//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { type EchoObjectAnnotation, EchoObjectAnnotationId } from './ddl/annotations';
import { DynamicEchoSchema } from './ddl/dynamic/dynamic-schema';
import { StoredEchoSchema } from './ddl/dynamic/stored-schema';
import { create } from './ddl/handler';
import { effectToJsonSchema } from './ddl/json';
import { TypedObject } from './ddl/typed-object-class';
import { Filter } from './query';
import { createDatabase } from './testing';

const testType: EchoObjectAnnotation = { typename: 'TestType', version: '1.0.0' };
const createTestSchemas = () => [
  create(StoredEchoSchema, {
    ...testType,
    jsonSchema: effectToJsonSchema(S.struct({ field: S.string })),
  }),
  create(StoredEchoSchema, {
    ...testType,
    typename: testType.typename + '2',
    jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
  }),
];

describe('schema registry', () => {
  test('add new schema', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(testType)({}) {}
    const dynamicSchema = registry.add(TestClass);
    const expectedSchema = TestClass.annotations({
      [EchoObjectAnnotationId]: { ...testType, storedSchemaId: dynamicSchema.id },
    });
    expect(dynamicSchema.ast).to.deep.eq(expectedSchema.ast);
    expect(registry.isRegistered(dynamicSchema)).to.be.true;
    expect(registry.getById(dynamicSchema.id)?.ast).to.deep.eq(expectedSchema.ast);
  });

  test('can store the same schema multiple times', async () => {
    const { registry } = await setupTest();
    class TestClass extends TypedObject(testType)({}) {}
    const stored1 = registry.add(TestClass);
    const stored2 = registry.add(TestClass);
    expect(stored1.id).to.not.equal(stored2.id);
  });

  test('get all dynamic schemas', async () => {
    const { db, registry } = await setupTest();
    const schemas = createTestSchemas().map((s) => db.add(s));
    const retrieved = registry.getAll();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('get all raw stored schemas', async () => {
    const { db } = await setupTest();
    const schemas = createTestSchemas().map((s) => db.add(s));
    const retrieved = db.query(Filter.schema(StoredEchoSchema)).objects;
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('is registered if was stored in db', async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredEchoSchema, {
      ...testType,
      jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
    });
    expect(registry.isRegistered(new DynamicEchoSchema(schemaToStore))).to.be.false;
    const storedSchema = db.add(schemaToStore);
    expect(registry.isRegistered(new DynamicEchoSchema(storedSchema))).to.be.true;
  });

  test("can't register schema if not stored in db", async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredEchoSchema, {
      ...testType,
      jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
    });
    expect(() => registry.register(schemaToStore)).to.throw();
    db.add(schemaToStore);
    expect(registry.register(schemaToStore)).not.to.be.undefined;
  });

  test('schema is invalidated on update', async () => {
    const { db, registry } = await setupTest();
    const storedSchema = db.add(createTestSchemas()[0]);
    const dynamicSchema = registry.getById(storedSchema.id)!;
    expect(dynamicSchema.getProperties().length).to.eq(1);
    dynamicSchema.addColumns({ newField: S.number });
    expect(dynamicSchema.getProperties().length).to.eq(2);
  });

  const setupTest = async () => {
    const { db } = await createDatabase();
    return { db, registry: db.schemaRegistry };
  };
});
