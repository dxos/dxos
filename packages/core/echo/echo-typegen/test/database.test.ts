//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, db, Text, Document } from '@dxos/echo-schema';
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
    await database.add(task);
    expect(task[db]).to.exist;

    const { objects: tasks } = database.query(Task.filter());
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  test('document field', async () => {
    const database = await createDatabase();

    const container = new Container();
    await database.add(container);

    container.documents.push(new Task());
    container.documents.push(new Contact());

    const queriedContainer = database.query(Container.filter()).objects[0];
    expect(queriedContainer.documents).to.have.length(2);
    expect(queriedContainer.documents[0].__typename).to.equal(Task.type.name);
    expect(queriedContainer.documents[1].__typename).to.equal(Contact.type.name);
  });

  describe('text', () => {
    test('text objects are auto-created on schema', async () => {
      const task = new Task();
      expect(task.description).to.be.instanceOf(Text);

      const database = await createDatabase();
      await database.add(task);
      expect(task.description).to.be.instanceOf(Text);

      task.description.model!.insert('test', 0);
      expect(task.description.model!.textContent).to.eq('test');
    });
  });
});
