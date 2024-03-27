//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { DynamicEchoSchema } from './dynamic-schema';
import { StoredEchoSchema } from './stored-schema';
import { Filter } from '../../query';
import { createDatabase } from '../../testing';
import { EchoObjectSchema } from '../echo-object-class';
import { effectToJsonSchema } from '../json-schema';
import * as E from '../reactive';
import { type EchoObjectAnnotation } from '../reactive';

const testType: EchoObjectAnnotation = { typename: 'TestType', version: '1.0.0' };
const createTestSchemas = () => [
  E.object(StoredEchoSchema, {
    ...testType,
    createdMs: 1,
    jsonSchema: effectToJsonSchema(S.struct({ field: S.string })),
  }),
  E.object(StoredEchoSchema, {
    ...testType,
    typename: testType.typename + '2',
    createdMs: 1,
    jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
  }),
];

describe('schema registry', () => {
  test('add new schema', async () => {
    const { registry } = await setupTest();
    class TestClass extends EchoObjectSchema(testType)({}) {}
    const dynamicSchema = registry.add(TestClass);
    expect(dynamicSchema.ast).to.deep.eq(TestClass.ast);
    expect(registry.getByTypename(TestClass.typename)?.ast).to.deep.eq(TestClass.ast);
  });

  test('typename has to be unique', async () => {
    const { registry } = await setupTest();
    class TestClass extends EchoObjectSchema(testType)({}) {}
    registry.add(TestClass);
    expect(() => registry.add(TestClass)).to.throw();
  });

  test('typename collision resolved using schema creation time', async () => {
    const { db, registry } = await setupTest();
    const schemaSavedFirst = db.add(createTestSchemas()[0]);
    const schemaSavedSecond = db.add(
      E.object(StoredEchoSchema, {
        typename: schemaSavedFirst.typename,
        version: schemaSavedFirst.version,
        createdMs: schemaSavedFirst.createdMs + 1,
        jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
      }),
    );
    const retrieved = registry.getByTypename(schemaSavedSecond.typename);
    expect(retrieved?.serializedSchema.createdMs).to.deep.eq(schemaSavedFirst.createdMs);
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
    const storedSchema = E.object(StoredEchoSchema, {
      ...testType,
      createdMs: 1,
      jsonSchema: effectToJsonSchema(S.struct({ field: S.number })),
    });
    expect(registry.isRegistered(new DynamicEchoSchema(storedSchema))).to.be.false;
    db.add(storedSchema);
    expect(registry.isRegistered(new DynamicEchoSchema(storedSchema))).to.be.true;
  });

  test('schema is invalidated on update', async () => {
    const { db, registry } = await setupTest();
    const storedSchema = db.add(createTestSchemas()[0]);
    const dynamicSchema = registry.getByTypename(storedSchema.typename)!;
    expect(dynamicSchema.getProperties().length).to.eq(1);
    dynamicSchema.addColumns({ newField: S.number });
    expect(dynamicSchema.getProperties().length).to.eq(2);
  });

  const setupTest = async () => {
    const { db } = await createDatabase(undefined, { useReactiveObjectApi: true });
    return { db, registry: db.schemaRegistry };
  };
});
