//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Contact, Container, Task, types } from './proto';
import { DatabaseRouter, EchoArray } from '..';
import { createDatabase } from '../testing';

// TODO(burdon): Test with/without saving to database.

describe('ordered-set', () => {
  // TODO(burdon): Test clear/reset (set length = 0).
  test('assignment', async () => {
    const root = new Task();
    expect(root.subTasks).to.have.length(0);

    root.subTasks.push(new Task());
    root.subTasks.push(new Task());
    root.subTasks.push(new Task());
    root.subTasks.push(new Task(), new Task());
    expect(root.subTasks).to.have.length(5);
    expect(root.subTasks.length).to.eq(5);
    expect(JSON.parse(JSON.stringify(root, undefined, 2)).subTasks).to.have.length(5);

    // Iterators.
    const ids = root.subTasks.map((task) => task.id);
    root.subTasks.forEach((task, i) => expect(task.id).to.eq(ids[i]));
    expect(Array.from(root.subTasks.values())).to.have.length(5);

    root.subTasks = [new Task(), new Task(), new Task()];
    expect(root.subTasks.length).to.eq(3);

    const { db } = await createDatabase(new DatabaseRouter().addSchema(types));
    db.add(root);
    await db.flush();
  });

  test('splice', async () => {
    const root = new Task();
    root.subTasks = new EchoArray([new Task(), new Task(), new Task()]);
    root.subTasks.splice(0, 2, new Task());
    expect(root.subTasks).to.have.length(2);

    const { db } = await createDatabase(new DatabaseRouter().addSchema(types));
    db.add(root);
    await db.flush();
  });

  test('array of plain objects', async () => {
    const root = new Container();
    const plain: Container.Record = { title: 'test', contacts: [new Contact({ name: 'Mykola' })] };
    root.records.push(plain);
    const { db } = await createDatabase(new DatabaseRouter().addSchema(types));
    db.add(root);
    await db.flush();

    expect(root.records).to.have.length(1);
    const queriedContainer = db.query(Container.filter()).objects[0];
    expect(queriedContainer.records.length).to.equal(1);
    expect(queriedContainer.records[0].contacts?.[0].name).to.equal('Mykola');
  });

  test('reset array', async () => {
    const { db } = await createDatabase(new DatabaseRouter().addSchema(types));
    const root = db.add(new Container());
    await db.flush();
    root.records.push({ title: 'one' });

    expect(root.records).to.have.length(1);

    root.records = [];
    expect(root.records).to.have.length(0);
    await db.flush();
    expect(root.records).to.have.length(0);

    root.records.push({ title: 'two' });

    expect(root.records).to.have.length(1);
    await db.flush();
    expect(root.records).to.have.length(1);
  });
});
