//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { create, Expando, getSchema } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, openAndClose, test } from '@dxos/test';

import { type EchoDatabase } from './proxy-db';
import { Filter } from './query';
import type { SerializedSpace } from './serialized-space';
import { Serializer } from './serializer';
import { Contact, EchoTestBuilder, Todo } from './testing';

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
      graph.schemaRegistry.addSchema([Todo]);

      const todo = db.add(create(Todo, { name: 'Testing' }));
      const data = serializer.exportObject(todo);

      expect(data).to.deep.include({
        '@id': todo.id,
        '@meta': { keys: [] },
        '@type': { '/': `dxn:type:${Todo.typename}` },
        name: 'Testing',
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
        const obj = create({} as any);
        obj.title = 'Test';
        db.add(obj);
        await db.flush();
        expect(db.objects).to.have.length(1);

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

        const { objects } = await db.query().run();
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
        const preserved = db.add(create(objValue));
        const deleted = db.add(create({ value: objValue.value + 1 }));
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

        const { objects } = await db.query().run();
        expect(objects).to.have.length(1);
        expect(objects[0].value).to.eq(42);
      }
    });

    test('nested objects', async () => {
      const serializer = new Serializer();

      let data: SerializedSpace;

      {
        const { db } = await builder.createDatabase();
        const obj = create({
          title: 'Main task',
          subtasks: [
            create(Expando, {
              title: 'Subtask 1',
            }),
            create(Expando, {
              title: 'Subtask 2',
            }),
          ],
          previous: create(Expando, {
            title: 'Previous task',
          }),
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
        graph.schemaRegistry.addSchema([Contact]);
        const contact = create(Contact, { name });
        db.add(contact);
        await db.flush();
        data = await new Serializer().export(db);
      }

      // Simulate JSON serialization.
      data = JSON.parse(JSON.stringify(data));

      {
        const { db, graph } = await builder.createDatabase();
        graph.schemaRegistry.addSchema([Contact]);

        await new Serializer().import(db, data);
        expect((await db.query().run()).objects).to.have.length(1);

        const {
          objects: [contact],
        } = await db.query(Filter.schema(Contact)).run();
        expect(contact.name).to.eq(name);
        expect(contact instanceof Contact).to.be.true;
        expect(getSchema(contact)).to.eq(Contact);
      }
    });

    test('loading many objects on db restart chunk load', async () => {
      const totalObjects = 123;
      const serializer = new Serializer();
      let data: SerializedSpace;

      const spaceKey = PublicKey.random();

      const kv = createTestLevel();
      await openAndClose(kv);

      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer(kv);
      const root = await peer.host.createSpaceRoot(spaceKey);

      {
        const db = await peer.openDatabase(spaceKey, root.url);
        for (let i = 0; i < totalObjects; i++) {
          db.add(create({ value: i }));
        }
        await db.flush();
        await peer.close();
      }
      {
        const peer = await builder.createPeer(kv);
        const db = await peer.openDatabase(spaceKey, root.url);
        data = await serializer.export(db);
        expect(data.objects.length).to.eq(totalObjects);
      }
    });

    test('loads v1 pre-dxn data', async () => {
      const serializer = new Serializer();

      const { db } = await builder.createDatabase();
      await serializer.import(db, V1_PRE_DXN_DATA);
      await assertNestedObjects(db);
    });
  });
});

const assertNestedObjects = async (db: EchoDatabase) => {
  const { objects } = await db.query().run();
  expect(objects).to.have.length(4);
  const main = objects.find((object) => object.title === 'Main task')!;
  expect(main).to.exist;
  expect(main.subtasks).to.have.length(2);
  expect(main.subtasks[0].title).to.eq('Subtask 1');
  expect(main.subtasks[1].title).to.eq('Subtask 2');
  expect(main.previous.title).to.eq('Previous task');
};

const V1_PRE_DXN_DATA = {
  objects: [
    {
      '@id': '01J0B41Q6MG20DSWGFZYFAQS7R',
      title: 'Subtask 1',
      '@version': 1,
      '@meta': { keys: [] },
      '@timestamp': 'Fri, 14 Jun 2024 10:17:48 GMT',
    },
    {
      '@id': '01J0B41Q6PNGJZ8EC1AT9G5QPZ',
      title: 'Subtask 2',
      '@version': 1,
      '@meta': { keys: [] },
      '@timestamp': 'Fri, 14 Jun 2024 10:17:48 GMT',
    },
    {
      '@id': '01J0B41Q6PG9VCZXVQ060MXBCH',
      title: 'Previous task',
      '@version': 1,
      '@meta': { keys: [] },
      '@timestamp': 'Fri, 14 Jun 2024 10:17:48 GMT',
    },
    {
      '@id': '01J0B41Q6Q65Z4W54TZ8MQWS8R',
      previous: {
        '@type': 'dxos.echo.model.document.Reference',
        itemId: '01J0B41Q6PG9VCZXVQ060MXBCH',
        protocol: null,
        host: null,
      },
      subtasks: [
        {
          '@type': 'dxos.echo.model.document.Reference',
          itemId: '01J0B41Q6MG20DSWGFZYFAQS7R',
          protocol: null,
          host: null,
        },
        {
          '@type': 'dxos.echo.model.document.Reference',
          itemId: '01J0B41Q6PNGJZ8EC1AT9G5QPZ',
          protocol: null,
          host: null,
        },
      ],
      title: 'Main task',
      '@version': 1,
      '@meta': { keys: [] },
      '@timestamp': 'Fri, 14 Jun 2024 10:17:48 GMT',
    },
  ],
  version: 1,
  timestamp: 'Fri, 14 Jun 2024 10:17:48 GMT',
  spaceKey: '69d5a25c3e0ad3c9d1c56572e247f98e74a75efa770bf4ef0b3f9ba33b6b601e',
};
