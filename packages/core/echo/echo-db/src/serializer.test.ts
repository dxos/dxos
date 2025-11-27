//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Query, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { type EchoDatabase } from './proxy-db';
import { Filter } from './query';
import { type SerializedSpace } from './serialized-space';
import { Serializer } from './serializer';
import { EchoTestBuilder, createTmpPath } from './testing';

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
      graph.schemaRegistry.addSchema([TestSchema.Task]);

      const task = db.add(Obj.make(TestSchema.Task, { title: 'Testing' }));
      const data = serializer.exportObject(task);

      expect(data).to.deep.include({
        '@id': task.id,
        '@meta': { keys: [] },
        '@type': {
          '/': `dxn:type:${Type.getTypename(TestSchema.Task)}:${Type.getVersion(TestSchema.Task)}`,
        },
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
        const obj = Obj.make(Type.Expando, {});
        obj.title = 'Test';
        db.add(obj);
        await db.flush();

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);

        data = await serializer.export(db);
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          '@id': obj.id,
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
        const obj1 = db.add(Obj.make(Type.Expando, { title: 'Hello' }));
        db.add(Obj.make(Type.Expando, { title: 'World' }));
        await db.flush();

        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(2);

        data = await serializer.export(db, Query.select(Filter.props({ title: 'Hello' })));
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          '@id': obj1.id,
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
        const preserved = db.add(Obj.make(Type.Expando, objValue));
        const deleted = db.add(Obj.make(Type.Expando, { value: preserved.value + 1 }));
        db.remove(deleted);
        await db.flush();

        data = await serializer.export(db);
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          '@id': preserved.id,
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
        const obj = Obj.make(Type.Expando, {
          title: 'Main task',
          subtasks: [
            Type.Ref.make(
              Obj.make(Type.Expando, {
                title: 'Subtask 1',
              }),
            ),
            Type.Ref.make(
              Obj.make(Type.Expando, {
                title: 'Subtask 2',
              }),
            ),
          ],
          previous: Type.Ref.make(
            Obj.make(Type.Expando, {
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
        graph.schemaRegistry.addSchema([TestSchema.Person]);
        const contact = Obj.make(TestSchema.Person, { name });
        db.add(contact);
        await db.flush();
        data = await new Serializer().export(db);
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db, graph } = await builder.createDatabase();
        graph.schemaRegistry.addSchema([TestSchema.Person]);

        await new Serializer().import(db, data);
        expect(await db.query(Query.select(Filter.everything())).run()).to.have.length(1);

        const [contact] = await db.query(Filter.type(TestSchema.Person)).run();
        expect(contact.name).to.eq(name);
        expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;
        expect(Obj.getSchema(contact)).to.eq(TestSchema.Person);
      }
    });

    test('loading many objects on db restart chunk load', { timeout: 10_000 }, async () => {
      const totalObjects = 123;
      const serializer = new Serializer();
      let data: SerializedSpace;
      const tmpPath = createTmpPath();

      const spaceKey = PublicKey.random();

      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const root = await peer.host.createSpaceRoot(spaceKey);

      {
        const db = await peer.openDatabase(spaceKey, root.url);
        for (let i = 0; i < totalObjects; i++) {
          db.add(Obj.make(Type.Expando, { value: i }));
        }
        await db.flush();
        await peer.close();
      }
      {
        const peer = await builder.createPeer({
          kv: createTestLevel(tmpPath),
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
