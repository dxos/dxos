//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { JsonSchema, Obj, Type } from '@dxos/echo';
import { Filter } from '@dxos/echo';
import { EchoSchema } from '@dxos/echo/internal';

import { EchoTestBuilder } from '../testing';

const Organization = Schema.Struct({
  name: Schema.String,
  address: Schema.String,
}).pipe(
  Type.object({
    typename: 'com.example.type.organization',
    version: '0.1.0',
  }),
);

const Contact = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.object({
    typename: 'com.example.type.person',
    version: '0.1.0',
  }),
);

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

  test('add new schema from json-schema', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([
      {
        typename: 'com.example.type.person',
        version: '0.1.0',
        jsonSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      },
    ]);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    expect(echoSchema.jsonSchema.$id).toEqual(`dxn:echo:@:${echoSchema.id}`);
    expect(echoSchema.typename).toEqual('com.example.type.person');
    expect(echoSchema.version).toEqual('0.1.0');
    expect(echoSchema.jsonSchema.properties).toEqual({
      name: expect.any(Object),
    });
  });

  test('database schema work with echo APIs', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([Contact]);
    expect(Type.getTypename(echoSchema)).toEqual('com.example.type.person');
    expect(Type.getVersion(echoSchema)).toEqual('0.1.0');
  });

  test('add new schema - preserves field order', async () => {
    const { registry } = await setupTest();
    const [echoSchema] = await registry.register([Organization]);
    expect(registry.hasSchema(echoSchema)).to.be.true;
    // Note: 'id' is added by EchoObjectSchema when extending the schema.
    expect(echoSchema.jsonSchema.propertyOrder).to.deep.eq(['name', 'address', 'id']);
  });

  test('schema has fields property for introspection', () => {
    // Type.Obj schemas should have .fields property from the original struct.
    expect(Object.keys(Organization.fields)).to.deep.eq(['name', 'address']);
    expect(Object.keys(Contact.fields)).to.deep.eq(['name']);
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
    const retrieved = await db.query(Filter.type(Type.PersistentType)).run();
    expect(retrieved.length).to.eq(schemas.length);
    for (const schema of retrieved) {
      expect(schemas.find((s) => s.id === schema.id)).not.to.undefined;
    }
  });

  test('query both database and runtime schemas', async () => {
    const { registry, db } = await setupTest();
    await db.graph.schemaRegistry.register([Organization]);

    const [echoSchema] = await registry.register([Contact]);
    const retrieved = await registry.query({ location: ['database', 'runtime'] }).run();
    // Note: Expando is registered by default in test builder.
    expect(retrieved.map(Type.getTypename)).toEqual([
      'com.example.type.expando',
      'com.example.type.organization',
      'com.example.type.person',
    ]);
  });

  test('query only runtime schemas', async () => {
    const { registry, db } = await setupTest();
    await db.graph.schemaRegistry.register([Organization]);

    const [echoSchema] = await registry.register([Contact]);
    const retrieved = await registry.query({ location: ['runtime'] }).run();
    // Note: Expando is registered by default in test builder.
    expect(retrieved.map(Type.getTypename)).toEqual(['com.example.type.expando', 'com.example.type.organization']);
  });

  test('query only database schemas', async () => {
    const { registry, db } = await setupTest();
    await db.graph.schemaRegistry.register([Organization]);

    const [echoSchema] = await registry.register([Contact]);
    const retrieved = await registry.query({ location: ['database'] }).run();
    expect(retrieved.map(Type.getTypename)).toEqual(['com.example.type.person']);
  });

  test('reactive query updates when runtime schemas are registered', async () => {
    const { registry, db } = await setupTest();

    const queryResult = registry.query({ location: ['database', 'runtime'] });

    let updateCount = 0;
    let latestResults: Type.AnyEntity[] = [];
    const unsubscribe = queryResult.subscribe(() => {
      updateCount++;
      latestResults = queryResult.results;
    });

    // Allow the reactive query to start (deferred via queueMicrotask).
    await sleep(10);

    // Register a runtime schema after the query is already subscribed.
    await db.graph.schemaRegistry.register([Organization]);

    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults.map(Type.getTypename)).toContain('com.example.type.organization');

    unsubscribe();
  });

  test('is registered if was stored in db', async () => {
    const { db, registry } = await setupTest();
    const schemaToStore = Obj.make(Type.PersistentType, {
      typename: 'com.example.type.test',
      version: '0.1.0',
      jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ field: Schema.Number })),
    });
    expect(registry.hasSchema(new EchoSchema(schemaToStore))).to.be.false;
    const persistentSchema = db.add(schemaToStore);
    expect(registry.hasSchema(new EchoSchema(persistentSchema))).to.be.true;
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
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase();
      const query = db.schemaRegistry.query({ typename: Type.getTypename(Contact) });
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
      expect(Type.getTypename(schema)).toEqual(Type.getTypename(Contact));
    }
  });

  test('can make an object with a dynamic schema', async () => {
    const { db } = await setupTest();
    const TestSchema = makeTestSchema();
    const [schema] = await db.schemaRegistry.register([TestSchema]);
    const object = db.add(Obj.make(schema, { name: 'Test' }));
    expect(object.name).toEqual('Test');
  });

  test('can change an object with a dynamic schema', async () => {
    const { db } = await setupTest();
    const TestSchema = makeTestSchema();
    const [schema] = await db.schemaRegistry.register([TestSchema]);
    const object = db.add(Obj.make(schema, { name: 'Test' }));
    Obj.change(object, (object) => {
      object.name = 'Test2';
    });
    expect(object.name).toEqual('Test2');
  });

  test('can add new fields and change them', async () => {
    const { db } = await setupTest();
    const TestSchema = makeTestSchema();
    const [schema] = await db.schemaRegistry.register([TestSchema]);
    const object = db.add(
      Obj.make(schema, {
        name: 'Test',
      }),
    );

    schema.addFields({ newField: Schema.String });
    Obj.change(object, (object) => {
      object.newField = 'Test3';
    });
    expect(object.newField).toEqual('Test3');
  });
});

// Separate test schema instance to avoid cross-test pollution.
const makeTestSchema = () =>
  Schema.Struct({
    name: Schema.String,
  }).pipe(
    Type.object({
      typename: 'com.example.type.test',
      version: '0.1.0',
    }),
  );
