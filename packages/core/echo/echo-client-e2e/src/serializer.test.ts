//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Filter, JsonSchema, Obj, Query, Ref, Type } from '@dxos/echo';
import { type EchoDatabase, type SerializedSpace, Serializer } from '@dxos/echo-client';
import { EchoTestBuilder, createTmpPath } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

describe('Serializer', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  describe('Objects', () => {
    test('export typed object', async () => {
      const serializer = new Serializer();
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Task]);

      const task = db.add(Obj.make(TestSchema.Task, { title: 'Testing' }));
      const data = serializer.exportObject(task);

      expect(data).to.deep.include({
        id: task.id,
        '@meta': { keys: [] },
        '@type': `dxn:${Type.getTypename(TestSchema.Task)}:${Type.getVersion(TestSchema.Task)}`,
        title: 'Testing',
      });
    });
  });

  describe('Spaces', () => {
    // TODO(dmaretskyi): Test with unloaded objects.
    test('basic', async () => {
      const serializer = new Serializer();
      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const obj = Obj.make(TestSchema.Expando, { title: 'Test' });
        db.add(obj);
        await db.flush();

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);

        data = await serializer.export(db);
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          id: obj.id,
          '@meta': { keys: [] },
          title: 'Test',
        });
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db } = await builder.createDatabase();
        await serializer.import(db, data);

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);
        expect(objects[0].title).to.eq('Test');
      }
    });

    test('query result', async () => {
      const serializer = new Serializer();
      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const obj1 = db.add(Obj.make(TestSchema.Expando, { title: 'Hello' }));
        db.add(Obj.make(TestSchema.Expando, { title: 'World' }));
        await db.flush();

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(2);

        data = await serializer.export(db, Query.select(Filter.props({ title: 'Hello' })));
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          id: obj1.id,
          '@meta': { keys: [] },
          title: 'Hello',
        });
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db } = await builder.createDatabase();
        await serializer.import(db, data);

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);
        expect(objects[0].title).to.eq('Hello');
      }
    });

    test('deleted objects', async () => {
      const serializer = new Serializer();
      const objValue = { value: 42 };
      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const preserved = db.add(Obj.make(TestSchema.Expando, objValue));
        const deleted = db.add(Obj.make(TestSchema.Expando, { value: preserved.value + 1 }));
        db.remove(deleted);
        await db.flush();

        data = await serializer.export(db);
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          id: preserved.id,
          '@meta': { keys: [] },
          ...objValue,
        });
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db } = await builder.createDatabase();
        await serializer.import(db, data);

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);
        expect(objects[0].value).to.eq(42);
      }
    });

    test('nested objects', async () => {
      const serializer = new Serializer();

      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const obj = Obj.make(TestSchema.Expando, {
          title: 'Main task',
          subtasks: [
            Ref.make(
              Obj.make(TestSchema.Expando, {
                title: 'Subtask 1',
              }),
            ),
            Ref.make(
              Obj.make(TestSchema.Expando, {
                title: 'Subtask 2',
              }),
            ),
          ],
          previous: Ref.make(
            Obj.make(TestSchema.Expando, {
              title: 'Previous task',
            }),
          ),
        });
        db.add(obj);
        await db.flush();

        data = await serializer.export(db);
        expect(data.objects).to.have.length(4);
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db } = await builder.createDatabase();
        await serializer.import(db, data);

        await assertNestedObjects(db);
      }
    });

    test('serialize object with schema', async () => {
      let data: SerializedSpace;
      const name = 'Rich Burton';

      {
        const { db, graph } = await builder.createDatabase();
        graph.registry.add([TestSchema.Person]);
        const contact = Obj.make(TestSchema.Person, { name });
        db.add(contact);
        await db.flush();
        data = await new Serializer().export(db);
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db, graph } = await builder.createDatabase();
        graph.registry.add([TestSchema.Person]);

        await new Serializer().import(db, data);
        expect(await db.query(Query.select(Filter.everything())).run()).to.have.length(1);

        const [contact] = await db.query(Filter.type(TestSchema.Person)).run();
        expect(contact.name).to.eq(name);
        expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;
      }
    });

    test('Type.Type entity survives export/import round-trip with correct kind brand', async () => {
      let data: SerializedSpace;
      const typename = 'example.type.roundTrip';

      {
        const { db } = await builder.createDatabase();
        const roundTrip = await db.addType(
          Type.makeObjectFromJsonSchema({
            typename,
            version: '0.1.0',
            jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ title: Schema.String })) as JsonSchema.JsonSchema,
          }),
        );
        Type.update(roundTrip, (draft) => {
          draft.name = 'Round Trip Type';
        });
        await db.flush();
        data = await new Serializer().export(db);
      }

      // Snapshot must NOT carry `kind` as a data field — it's the entity-kind
      // brand (lives on [KindId] / SYSTEM namespace), not a data field on
      // TypeSchema. Earlier the export side was leaking it.
      // `typename` / `version` are not data fields either; they live in
      // `EntityMeta` (the canonical registry-provenance pair) and surface
      // through `@meta.key` / `@meta.version` in the JSON snapshot.
      const typeRow = data.objects.find((o: any) => o['@meta']?.key === typename);
      expect(typeRow).toBeDefined();
      expect(typeRow).not.toHaveProperty('kind');
      expect(typeRow).not.toHaveProperty('typename');
      expect(typeRow).not.toHaveProperty('version');

      // Survive a JSON round-trip — mirrors what `client.spaces.import` does.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db } = await builder.createDatabase();
        await new Serializer().import(db, data);

        // The reconstituted Type.Type entity must brand `KindId = Type`.
        // `Filter.type(Type.Type)` fans into both the DB and the in-process
        // registry (which holds the pre-seeded `Type.Type` and builder defaults),
        // so locate the round-tripped entity by typename rather than by count.
        const entities = await db.query(Filter.type(Type.Type)).run();
        const roundTrip = entities.find((entity) => Type.getTypename(entity) === typename);
        expect(roundTrip).toBeDefined();
        expect(Type.isType(roundTrip!)).to.be.true;
        expect(Type.getTypename(roundTrip!)).to.eq(typename);

        // Every returned schema must have a valid typename — the `getSortKey` path that
        // Composer's markdown editor hits via `useLinkQuery` must not throw `Invalid typename`.
        // Persisted types live in the db (not the shared registry), so query the space.
        for (const schema of entities) {
          expect(() => Type.getTypename(schema as any)).not.to.throw();
        }
        expect(entities.some((schema) => Type.getTypename(schema as any) === typename)).to.be.true;
      }
    });

    test('loading many objects on db restart chunk load', { timeout: 30_000 }, async () => {
      const totalObjects = 123;
      const serializer = new Serializer();
      let data: SerializedSpace;
      const tmpPath = createTmpPath();

      const spaceKey = PublicKey.random();

      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const root = await peer.host.createSpaceRoot(Context.default(), spaceKey);

      {
        const db = await peer.openDatabase(spaceKey, root.url);
        for (let i = 0; i < totalObjects; i++) {
          db.add(Obj.make(TestSchema.Expando, { value: i }));
        }
        await db.flush();
        await peer.close();
      }
      {
        const peer = await builder.createPeer({
          storagePath: tmpPath,
        });
        const db = await peer.openDatabase(spaceKey, root.url);
        data = await serializer.export(db);
        expect(data.objects.length).to.eq(totalObjects);
      }
    });
  });
});

const assertNestedObjects = async (db: EchoDatabase) => {
  const objects = await db.query(Query.select(Filter.everything())).run();
  expect(objects).to.have.length(4);
  const main = objects.find((object) => object.title === 'Main task')!;
  expect(main).to.exist;
  expect(main.subtasks).to.have.length(2);
  expect(main.subtasks[0].target?.title).to.eq('Subtask 1');
  expect(main.subtasks[1].target?.title).to.eq('Subtask 2');
  expect(main.previous.target?.title).to.eq('Previous task');
};
