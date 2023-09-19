//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, clone, db, Expando, Text } from '@dxos/echo-schema';
import { createDatabase } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

import { Contact, Container, Task } from './proto';

describe('database', () => {
  test('creating objects', async () => {
    const { db: database } = await createDatabase();

    const task = new Task({ title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(task[base]).to.exist;
    expect(task[db]).to.be.undefined;

    database.add(task);
    await database.flush();
    expect(task[db]).to.exist;

    const { objects: tasks } = database.query(Task.filter());
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  test('enums', async () => {
    const { db: database } = await createDatabase();

    {
      const container = new Container({ records: [{ type: Container.Record.Type.WORK }] });
      await database.add(container);
    }

    {
      const { objects } = database.query(Container.filter());
      const [container] = objects;
      expect(container.records).to.have.length(1);
      expect(container.records[0].type).to.eq(Container.Record.Type.WORK);
    }
  });

  describe('dxos.schema.Text', () => {
    test('text objects are auto-created on schema', async () => {
      const { db: database } = await createDatabase();

      const task = new Task();
      expect(task.description).to.be.instanceOf(Text);

      database.add(task);
      await database.flush();
      expect(task.description).to.be.instanceOf(Text);

      task.description.model!.insert('test', 0);
      expect(task.description.model!.textContent).to.eq('test');
    });
  });

  test('dxos.schema.Expando', async () => {
    const { db: database } = await createDatabase();

    {
      const container = new Container();
      database.add(container);
      await database.flush();

      container.expandos.push(new Expando({ foo: 100 }));
      container.expandos.push(new Expando({ bar: 200 }));
    }

    {
      const { objects } = database.query(Container.filter());
      const [container] = objects;
      expect(container.expandos).to.have.length(2);
      expect(container.expandos[0].foo).to.equal(100);
      expect(container.expandos[1].bar).to.equal(200);
    }
  });

  // TODO(burdon): Test cannot update random properties.
  test('dxos.schema.TextObject', async () => {
    const { db: database } = await createDatabase();

    {
      const container = new Container();
      database.add(container);
      await database.flush();

      container.objects.push(new Task());
      container.objects.push(new Contact());
    }

    {
      const { objects } = database.query(Container.filter());
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(container.objects[0].__typename).to.equal(Task.type.name);
      expect(container.objects[1].__typename).to.equal(Contact.type.name);
    }
  });

  test('object fields', async () => {
    const task = new Task();

    task.title = 'test';
    expect(task.title).to.eq('test');
    expect(task.__meta.keys).to.exist;
    expect(task.__meta.keys).to.have.length(0);

    task.__meta.keys.push({ source: 'example', id: 'test' });
    expect(task.__meta.keys).to.have.length(1);
  });

  test('text objects are auto-created on schema', async () => {
    const { db: database1 } = await createDatabase();
    const { db: database2 } = await createDatabase();

    const task1 = new Task();
    task1.description.model!.insert('test', 0);
    database1.add(task1);
    await database1.flush();

    const task2 = database2.add(clone(task1, { additional: [task1.description] }));
    await database2.flush();
    expect(task2.description).to.be.instanceOf(Text);
    expect(task2.description.model!.textContent).to.eq('test');
    expect(task2 !== task1).to.be.true;
  });

  test('clone', async () => {
    const { db: db1 } = await createDatabase();
    const { db: db2 } = await createDatabase();

    const task1 = new Task({
      title: 'Main task',
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1);
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect(task2).to.be.instanceOf(Task);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  });
});
