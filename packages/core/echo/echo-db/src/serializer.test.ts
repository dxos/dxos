//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import type { SpaceDoc } from '@dxos/echo-protocol';
import { create, Expando, getSchema } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { AutomergeContext } from './core-db';
import { Hypergraph } from './hypergraph';
import { EchoDatabaseImpl } from './proxy-db';
import { Filter } from './query';
import { type SerializedSpace, Serializer } from './serializer';
import { Contact, EchoTestBuilder } from './testing';

describe('Serializer', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // TODO(dmaretskyi): Test with unloaded objects.
  test('Basic', async () => {
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

  test('Deleted objects', async () => {
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

  test('Nested objects', async () => {
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

      const { objects } = await db.query().run();
      expect(objects).to.have.length(4);
      const main = objects.find((object) => object.title === 'Main task')!;
      expect(main).to.exist;
      expect(main.subtasks).to.have.length(2);
      expect(main.subtasks[0].title).to.eq('Subtask 1');
      expect(main.subtasks[1].title).to.eq('Subtask 2');
      expect(main.previous.title).to.eq('Previous task');
    }
  });

  test('Serialize object with schema', async () => {
    let data: SerializedSpace;
    const name = 'Rich Burton';

    {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema(Contact);
      const contact = create(Contact, { name });
      db.add(contact);
      await db.flush();
      data = await new Serializer().export(db);
    }

    // Simulate JSON serialization.
    data = JSON.parse(JSON.stringify(data));

    {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema(Contact);

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

  test('Loading many objects on db restart chunk load', async () => {
    const totalObjects = 123;
    const serializer = new Serializer();
    let data: SerializedSpace;

    const spaceKey = PublicKey.random();
    const graph = new Hypergraph();
    const automergeContext = new AutomergeContext();
    const doc = automergeContext.repo.create<SpaceDoc>();
    {
      const db = new EchoDatabaseImpl({ graph, automergeContext, spaceKey });
      await db.coreDatabase.open({ rootUrl: doc.url });
      for (let i = 0; i < totalObjects; i++) {
        db.add(create({ value: i }));
      }
      await db.flush();
    }
    {
      const db = new EchoDatabaseImpl({ graph, automergeContext, spaceKey });
      await db.coreDatabase.open({ rootUrl: doc.url });
      data = await serializer.export(db);
      expect(data.objects.length).to.eq(totalObjects);
    }
  });
});
