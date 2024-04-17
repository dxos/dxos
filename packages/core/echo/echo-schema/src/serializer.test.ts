//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Expando } from './effect/reactive';
import { Filter } from './query';
import { getSchema, create } from './schema';
import { Serializer, type SerializedSpace } from './serializer';
import { createDatabase } from './testing';
import { Contact } from './tests/schema';

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

      const { objects } = db.query();
      expect(objects).to.have.length(1);
      expect(objects[0].title).to.eq('Test');
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

      const { objects } = db.query();
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
      } = db.query(Filter.schema(Contact));
      expect(contact.name).to.eq(name);
      expect(contact instanceof Contact).to.be.true;
      expect(getSchema(contact)).to.eq(Contact);
    }
  });
});
