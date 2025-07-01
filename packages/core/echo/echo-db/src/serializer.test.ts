//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Query } from '@dxos/echo';
import { Expando, getSchema, Ref } from '@dxos/echo-schema';
import { Testing } from '@dxos/echo-schema/testing';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { live } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';

import { type EchoDatabase } from './proxy-db';
import { Filter } from './query';
import { type SerializedSpace } from './serialized-space';
import { Serializer } from './serializer';
import { EchoTestBuilder } from './testing';

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
      graph.schemaRegistry.addSchema([Testing.Task]);

      const task = db.add(live(Testing.Task, { title: 'Testing' }));
      const data = serializer.exportObject(task);

      expect(data).to.deep.include({
        '@id': task.id,
        '@meta': { keys: [] },
        '@type': { '/': `dxn:type:${Testing.Task.typename}:${Testing.Task.version}` },
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
        const obj = live({} as any);
        obj.title = 'Test';
        db.add(obj);
        await db.flush();

        const { objects } = await db.query(Query.select(Filter.everything())).run();
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

        const { objects } = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);
        expect(objects[0].title).to.eq('Test');
      }
    });

    test('deleted objects', async () => {
      const serializer = new Serializer();
      const objValue = { value: 42 };
      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const preserved = db.add(live(objValue));
        const deleted = db.add(live({ value: preserved.value + 1 }));
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

        const { objects } = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(1);
        expect(objects[0].value).to.eq(42);
      }
    });

    test('nested objects', async () => {
      const serializer = new Serializer();

      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const obj = live({
          title: 'Main task',
          subtasks: [
            Ref.make(
              live(Expando, {
                title: 'Subtask 1',
              }),
            ),
            Ref.make(
              live(Expando, {
                title: 'Subtask 2',
              }),
            ),
          ],
          previous: Ref.make(
            live(Expando, {
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
        graph.schemaRegistry.addSchema([Testing.Contact]);
        const contact = live(Testing.Contact, { name });
        db.add(contact);
        await db.flush();
        data = await new Serializer().export(db);
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db, graph } = await builder.createDatabase();
        graph.schemaRegistry.addSchema([Testing.Contact]);

        await new Serializer().import(db, data);
        expect((await db.query(Query.select(Filter.everything())).run()).objects).to.have.length(1);

        const {
          objects: [contact],
        } = await db.query(Filter.type(Testing.Contact)).run();
        expect(contact.name).to.eq(name);
        expect(contact instanceof Testing.Contact).to.be.true;
        expect(getSchema(contact)).to.eq(Testing.Contact);
      }
    });

    test('loading many objects on db restart chunk load', { timeout: 10_000 }, async () => {
      const totalObjects = 123;
      const serializer = new Serializer();
      let data: SerializedSpace;

      const spaceKey = PublicKey.random();

      const kv = createTestLevel();
      await openAndClose(kv);

      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer({ kv });
      const root = await peer.host.createSpaceRoot(spaceKey);

      {
        const db = await peer.openDatabase(spaceKey, root.url);
        for (let i = 0; i < totalObjects; i++) {
          db.add(live({ value: i }));
        }
        await db.flush();
        await peer.close();
      }
      {
        const peer = await builder.createPeer({ kv });
        const db = await peer.openDatabase(spaceKey, root.url);
        data = await serializer.export(db);
        expect(data.objects.length).to.eq(totalObjects);
      }
    });
  });
});

const assertNestedObjects = async (db: EchoDatabase) => {
  const { objects } = await db.query(Query.select(Filter.everything())).run();
  expect(objects).to.have.length(4);
  const main = objects.find((object) => object.title === 'Main task')!;
  expect(main).to.exist;
  expect(main.subtasks).to.have.length(2);
  expect(main.subtasks[0].target?.title).to.eq('Subtask 1');
  expect(main.subtasks[1].target?.title).to.eq('Subtask 2');
  expect(main.previous.target?.title).to.eq('Previous task');
};
