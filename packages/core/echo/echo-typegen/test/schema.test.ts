//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { DatabaseRouter, EchoDatabase, db, id } from '@dxos/echo-schema';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { Contact, Task } from './proto';

// TODO(burdon): Implement Task.from to deserialize JSON string.

// TODO(burdon): Factor out.
const createDatabase = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  const router = new DatabaseRouter();
  return new EchoDatabase(router, database);
};

describe('schema', () => {
  test('db', async () => {
    const db1 = await createDatabase();
    const task = new Task();
    expect(task[db]).to.be.undefined;
    await db1.save(task);
    expect(task[db]).not.to.be.undefined;
  });

  test('keys', () => {
    const contact = new Contact();
    expect(contact[id]).not.to.be.undefined;
    expect(Object.keys(contact).length).to.eq(5);

    // TODO(burdon): Test after saved with test database.
    expect(contact[id]).to.be.a('string');
  });

  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(contact.toJSON()).to.deep.eq({ name: 'User 1' });

    const task1 = new Task();
    task1.title = 'Task 1';
    expect(task1.title).to.eq('Task 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1' });

    task1.assignee = contact;
    expect(task1.assignee.name).to.eq('User 1');
    expect(task1.toJSON()).to.deep.eq({ title: 'Task 1', assignee: { id: contact[id] } });
    expect(JSON.stringify(task1)).to.eq(JSON.stringify({ title: 'Task 1', assignee: { id: contact[id] } }));
  });

  test('json with recursion', () => {
    const contact = new Contact({ name: 'User 1' });
    contact.tasks.push(new Task({ title: 'Task 1', assignee: contact }));
    contact.tasks.push(new Task({ title: 'Task 2', assignee: contact }));

    expect(contact.toJSON()).to.deep.eq({
      name: 'User 1',
      tasks: [
        {
          id: contact.tasks[0][id]
        },
        {
          id: contact.tasks[1][id]
        }
      ]
    });
  });

  test('ordered set', () => {
    const task = new Task();
    expect(task.subTasks).to.have.length(0);

    // TODO(burdon): Implement assignment = [].
    task.subTasks.push(new Task());
    task.subTasks.push(new Task());
    task.subTasks.push(new Task());
    expect(task.subTasks).to.have.length(3);
    const ids = task.subTasks.map((task) => task[id]);
    task.subTasks.forEach((task, i) => expect(task[id]).to.eq(ids[i]));

    task.subTasks.splice(0, 2, new Task());
    expect(task.subTasks).to.have.length(2);
    expect(task.subTasks[1][id]).to.eq(ids[2]);

    const tasks = Array.from(task.subTasks.values());
    expect(tasks).to.have.length(2);
  });
});
