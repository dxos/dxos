//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import {
  EchoSchema,
  EntityKind,
  StoredSchema,
  type TypeAnnotation,
  TypeAnnotationId,
  getSchemaTypename,
  toJsonSchema,
} from '@dxos/echo/internal';

import { Filter } from '../query';
import { EchoTestBuilder } from '../testing';

const Organization = Schema.Struct({
  name: Schema.String,
  address: Schema.String,
}).annotations({
  [TypeAnnotationId]: {
    kind: EntityKind.Object,
    typename: 'example.com/type/Organization',
    version: '0.1.0',
  } satisfies TypeAnnotation,
});

const Contact = Schema.Struct({
  name: Schema.String,
}).annotations({
  [TypeAnnotationId]: {
    kind: EntityKind.Object,
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  } satisfies TypeAnnotation,
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
    const [echoSchema] = await registry.register([Contact]);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    expect(echoSchema.jsonSchema.$id).toEqual(`dxn:echo:@:${echoSchema.id}`);
  });

  test('add new schema - preserves field order', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([Organization]);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    expect(echoSchema.jsonSchema.propertyOrder).to.deep.eq(Object.keys(Organization.fields));
  });

  test('can store the same schema multiple times', async () => {
    const { registry } = await setupTest();
    const [stored1] = await registry.register([Organization]);
    const [stored2] = await registry.register([Organization]);
    expect(stored1.id).to.not.equal(stored2.id);
  });

  test('get all dynamic schemas', async () => {
    const { registry } = await setupTest();
    const schemas = await registry.register([Organization, Contact]);
    const retrieved = await registry.query().run();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('get all raw stored schemas', async () => {
    const { db, registry } = await setupTest();
    const schemas = await registry.register([Organization, Contact]);
    const retrieved = (await db.query(Filter.type(StoredSchema)).run()).objects;
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('is registered if was stored in db', async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = Obj.make(StoredSchema, {
      typename: 'example.com/type/Test',
      version: '0.1.0',
      jsonSchema: toJsonSchema(Schema.Struct({ field: Schema.Number })),
    });
    expect(registry.hasSchema(new EchoSchema(schemaToStore))).to.be.false;
    const storedSchema = db.add(schemaToStore);
    expect(registry.hasSchema(new EchoSchema(storedSchema))).to.be.true;
  });

  test('schema is invalidated on update', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([Contact]);
    expect(echoSchema.getProperties().length).to.eq(1);
    echoSchema.addFields({ newField: Schema.Number });
    expect(echoSchema.getProperties().length).to.eq(2);
  });

  test('reactive schema query after reload', async (ctx) => {
    await using peer = await builder.createPeer();

    {
      await using db = await peer.createDatabase();
      await db.schemaRegistry.register([Contact]);
      await db.flush({ indexes: true });
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase();
      const query = db.schemaRegistry.query({ typename: getSchemaTypename(Contact) });
      const schema = await new Promise<EchoSchema>((resolve) => {
        const immediate = query.runSync();
        if (immediate.length > 0) {
          resolve(immediate[0]);
          return;
        }

        const unsubscribe = query.subscribe(() => {
          if (query.results.length > 0) {
            resolve(query.results[0]);
          }
        });
        ctx.onTestFinished(unsubscribe);
      });
      expect(getSchemaTypename(schema)).toEqual(getSchemaTypename(Contact));
    }
  });
});
