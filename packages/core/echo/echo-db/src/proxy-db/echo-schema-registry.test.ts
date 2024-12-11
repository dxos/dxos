//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  EchoIdentifierAnnotationId,
  EchoSchema,
  ObjectAnnotationId,
  S,
  StoredSchema,
  toJsonSchema,
} from '@dxos/echo-schema';
import { create } from '@dxos/live-object';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

const Org = S.Struct({
  name: S.String,
  address: S.String,
}).annotations({
  [ObjectAnnotationId]: { typename: 'example.com/type/Org', version: '0.1.0' },
});

const Contact = S.Struct({
  name: S.String,
}).annotations({
  [ObjectAnnotationId]: { typename: 'example.com/type/Contact', version: '0.1.0' },
});

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
    const echoSchema = registry.addSchema(Contact);
    const expectedSchema = Contact.annotations({
      [ObjectAnnotationId]: { typename: 'example.com/type/Contact', version: '0.1.0' },
      [EchoIdentifierAnnotationId]: `dxn:echo:@:${echoSchema.id}`,
    });
    console.log(echoSchema.ast);
    console.log(expectedSchema.ast);
    expect(echoSchema.ast).to.deep.eq(expectedSchema.ast);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    expect(registry.getSchemaById(echoSchema.id)?.ast).to.deep.eq(expectedSchema.ast);
    expect(echoSchema.jsonSchema.$id).toEqual(`dxn:echo:@:${echoSchema.id}`);
  });

  // TODO(dmaretskyi): Fix schema field order.
  test.skip('add new schema - preserves field order', async () => {
    const { registry } = await setupTest();
    const echoSchema = registry.addSchema(Org);
    const expectedSchema = Org.annotations({
      [ObjectAnnotationId]: { typename: 'example.com/type/Org', version: '0.1.0' },
      [EchoIdentifierAnnotationId]: `dxn:echo:@:${echoSchema.id}`,
    });
    console.log(echoSchema.ast);
    console.log(expectedSchema.ast);
    expect(echoSchema.ast).to.deep.eq(expectedSchema.ast);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    expect(registry.getSchemaById(echoSchema.id)?.ast).to.deep.eq(expectedSchema.ast);
  });

  test('can store the same schema multiple times', async () => {
    const { registry } = await setupTest();
    const stored1 = registry.addSchema(Org);
    const stored2 = registry.addSchema(Org);
    expect(stored1.id).to.not.equal(stored2.id);
  });

  test('get all dynamic schemas', async () => {
    const { registry } = await setupTest();
    const schemas = await registry.register([{ schema: Org }, { schema: Contact }]);
    const retrieved = await registry.query().run();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('get all raw stored schemas', async () => {
    const { db, registry } = await setupTest();
    const schemas = await registry.register([{ schema: Org }, { schema: Contact }]);
    const retrieved = (await db.query(Filter.schema(StoredSchema)).run()).objects;
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('is registered if was stored in db', async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredSchema, {
      typename: 'example.com/type/Test',
      version: '0.1.0',
      jsonSchema: toJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(registry.hasSchema(new EchoSchema(schemaToStore))).to.be.false;
    const storedSchema = db.add(schemaToStore);
    expect(registry.hasSchema(new EchoSchema(storedSchema))).to.be.true;
  });

  test("can't register schema if not stored in db", async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = create(StoredSchema, {
      typename: 'example.com/type/Test',
      version: '0.1.0',
      jsonSchema: toJsonSchema(S.Struct({ field: S.Number })),
    });
    expect(() => registry.registerSchema(schemaToStore)).to.throw();
    db.add(schemaToStore);
    expect(registry.registerSchema(schemaToStore)).not.to.be.undefined;
  });

  test('schema is invalidated on update', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([{ schema: Contact }]);
    expect(echoSchema.getProperties().length).to.eq(1);
    echoSchema.addFields({ newField: S.Number });
    expect(echoSchema.getProperties().length).to.eq(2);
  });
});
