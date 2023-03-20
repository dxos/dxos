//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, db, Expando, Text } from '@dxos/echo-schema';
import { createDatabase } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

import { Contact, Container, Task } from './proto';

describe('database', () => {
  test('saving', async () => {
    const task = new Task({ title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(task[base]).to.exist;
    expect(task[db]).to.be.undefined;

    const database = await createDatabase();
    database.add(task);
    await database.flush();
    expect(task[db]).to.exist;

    const { objects: tasks } = database.query(Task.filter());
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  describe('dxos.schema.Text', () => {
    test('text objects are auto-created on schema', async () => {
      const task = new Task();
      expect(task.description).to.be.instanceOf(Text);

      const database = await createDatabase();
      database.add(task);
      await database.flush();
      expect(task.description).to.be.instanceOf(Text);

      task.description.model!.insert('test', 0);
      expect(task.description.model!.textContent).to.eq('test');
    });
  });

  test('dxos.schema.Expando', async () => {
    const database = await createDatabase();

    const container = new Container();
    database.add(container);
    await database.flush();

    container.expandos.push(new Expando({ foo: 100 }));
    container.expandos.push(new Expando({ bar: 200 }));

    const queriedContainer = database.query(Container.filter()).objects[0];
    expect(queriedContainer.expandos).to.have.length(2);
    expect(queriedContainer.expandos[0].foo).to.equal(100);
    expect(queriedContainer.expandos[1].bar).to.equal(100);
  });

  test('dxos.schema.TextObject', async () => {
    const database = await createDatabase();

    const container = new Container();
    database.add(container);
    await database.flush();

    container.objects.push(new Task());
    container.objects.push(new Contact());

    const queriedContainer = database.query(Container.filter()).objects[0];
    expect(queriedContainer.objects).to.have.length(2);
    expect(queriedContainer.objects[0].__typename).to.equal(Task.type.name);
    expect(queriedContainer.objects[1].__typename).to.equal(Contact.type.name);
  });

  test('enums', async () => {
    const database = await createDatabase();

    const container = new Container({ records: [{ type: Container.Record.Type.WORK }] });
    await database.add(container);
    const queriedContainer = database.query(Container.filter()).objects[0];
    expect(queriedContainer.records).to.have.length(1);
    expect(queriedContainer.records[0].type).to.eq(Container.Record.Type.WORK);
  });
});
