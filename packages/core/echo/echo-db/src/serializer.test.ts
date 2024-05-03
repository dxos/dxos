//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import type { SpaceDoc } from '@dxos/echo-pipeline';
import { getSchema, create, Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { AutomergeContext } from './automerge';
import { EchoDatabaseImpl } from './database';
import { Hypergraph } from './hypergraph';
import { Filter } from './query';
import { Serializer, type SerializedSpace } from './serializer';
import { createDatabase, Contact } from './testing';

describe('Serializer', () => {
  // TODO(dmaretskyi): Test with unloaded objects.
  test('Basic', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;

    {
      const { db } = await createDatabase();
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

    {
      const { db } = await createDatabase();
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
      const { db } = await createDatabase();
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

    {
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = await db.query().run();
      expect(objects).to.have.length(1);
      expect(objects[0].value).to.eq(42);
    }
  });

  test('Nested objects', async () => {
    const serializer = new Serializer();

    let serialized: SerializedSpace;

    {
      const { db } = await createDatabase();
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

      serialized = await serializer.export(db);
      expect(serialized.objects).to.have.length(4);
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, serialized);

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
      const { db, graph } = await createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Contact);
      const contact = create(Contact, { name });
      db.add(contact);
      await db.flush();
      data = await new Serializer().export(db);
    }

    {
      const { db, graph } = await createDatabase();
      graph.runtimeSchemaRegistry.registerSchema(Contact);

      await new Serializer().import(db, data);
      expect(db.objects).to.have.length(1);

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
      await db._automerge.open({ rootUrl: doc.url });
      for (let i = 0; i < totalObjects; i++) {
        db.add(create({ value: i }));
      }
      await db.flush();
    }
    {
      const db = new EchoDatabaseImpl({ graph, automergeContext, spaceKey });
      await db._automerge.open({ rootUrl: doc.url });
      data = await serializer.export(db);
      expect(data.objects.length).to.eq(totalObjects);
    }
  });
});
