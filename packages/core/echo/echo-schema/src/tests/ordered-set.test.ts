//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { Contact, Container, Task } from './schema';
import { type ReactiveObject } from '../effect/reactive';
import { create } from '../effect/reactive';
import { Hypergraph } from '../hypergraph';
import { Filter } from '../query';
import { createDatabase } from '../testing';

// TODO(burdon): Test with/without saving to database.

describe('ordered-set', () => {
  // TODO(burdon): Test clear/reset (set length = 0).
  test('assignment', async () => {
    const root = newTask();
    expect(root.subTasks).to.have.length(0);

    range(3).forEach(() => root.subTasks!.push(newTask()));
    root.subTasks!.push(newTask(), newTask());

    expect(root.subTasks).to.have.length(5);
    expect(root.subTasks!.length).to.eq(5);
    expect(JSON.parse(JSON.stringify(root, undefined, 2)).subTasks).to.have.length(5);

    // Iterators.
    const ids = root.subTasks!.map((task) => task!.id);
    root.subTasks!.forEach((task, i) => expect(task!.id).to.eq(ids[i]));
    expect(Array.from(root.subTasks!.values())).to.have.length(5);

    root.subTasks = [create(Task, {}), create(Task, {}), create(Task, {})];
    expect(root.subTasks.length).to.eq(3);

    await addToDatabase(root);
  });

  test('splice', async () => {
    const root = newTask();
    root.subTasks = range(3).map(newTask);
    root.subTasks.splice(0, 2, newTask());
    expect(root.subTasks).to.have.length(2);
    await addToDatabase(root);
  });

  test('array of plain objects', async () => {
    const root = create(Container, { records: [] });
    root.records!.push({
      title: 'test',
      contacts: [create(Contact, { name: 'tester' })],
    });
    const { db } = await addToDatabase(root);

    expect(root.records).to.have.length(1);
    const queriedContainer = db.query(Filter.schema(Container)).objects[0]!;
    expect(queriedContainer.records!.length).to.equal(1);
    expect(queriedContainer.records![0]!.contacts![0]!.name).to.equal('tester');
  });

  test('reset array', async () => {
    const { db, obj: root } = await addToDatabase(create(Container, { records: [] }));

    root.records!.push({ title: 'one' });
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

const newTask = () => create(Task, { subTasks: [] });

const addToDatabase = async <T>(obj: ReactiveObject<T>) => {
  const graph = new Hypergraph();
  graph.types.registerEffectSchema(Task, Container, Contact);
  const { db } = await createDatabase(graph);
  db.add(obj);
  await db.flush();
  return { db, obj };
};
