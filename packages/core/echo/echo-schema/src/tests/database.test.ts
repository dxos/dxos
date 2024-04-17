//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Contact, Container, RecordType, Task, Todo } from './schema';
import { getAutomergeObjectCore } from '../automerge';
import { create, Expando, getMeta, getSchema, typeOf } from '../effect/reactive';
import { Hypergraph } from '../hypergraph';
import { clone } from '../object';
import { Filter } from '../query';
import { createDatabase } from '../testing';

// TODO(burdon): Reconcile/document tests in parent folder.

describe('database', () => {
  test('creating objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = create(Task, { title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(() => getAutomergeObjectCore(task)).to.throw();
    expect(getSchema(task)?.ast).to.eq(Task.ast);
    expect(typeOf(task)?.itemId).to.eq('example.test.Task');

    database.add(task);
    await database.flush();
    expect(getAutomergeObjectCore(task).database).to.exist;

    const { objects: tasks } = database.query(Filter.schema(Task));
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  test('enums', async () => {
    const { db: database } = await createDbWithTypes();

    {
      const container = create(Container, { records: [{ type: RecordType.WORK }] });
      await database.add(container);
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.records).to.have.length(1);
      expect(container.records![0].type).to.eq(RecordType.WORK);
    }
  });

  test('dxos.schema.Expando', async () => {
    const { db: database } = await createDbWithTypes();

    {
      const container = create(Container, { objects: [] });
      database.add(container);
      await database.flush();

      container.objects!.push(create(Expando, { foo: 100 }));
      container.objects!.push(create(Expando, { bar: 200 }));
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(container.objects![0]!.foo).to.equal(100);
      expect(container.objects![1]!.bar).to.equal(200);
    }
  });

  test('dxos.schema.TextObject', async () => {
    const { db: database } = await createDbWithTypes();

    {
      const container = create(Container, { objects: [] });
      database.add(container);
      await database.flush();

      container.objects!.push(create(Task, {}));
      container.objects!.push(create(Contact, {}));
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(typeOf(container.objects![0])?.itemId).to.equal(Task.typename);
      expect(typeOf(container.objects![1])?.itemId).to.equal(Contact.typename);
    }
  });

  test('object fields', async () => {
    const task = create(Task, {});

    task.title = 'test';
    expect(task.title).to.eq('test');
    expect(getMeta(task).keys).to.have.length(0);

    getMeta(task).keys.push({ source: 'example', id: 'test' });
    expect(getMeta(task).keys).to.have.length(1);
  });

  test('clone', async () => {
    const { db: db1 } = await createDbWithTypes();
    const { db: db2 } = await createDbWithTypes();

    const task1 = create(Task, { title: 'Main task' });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1);
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);

    db2.add(task2);
    await db2.flush();
    expect(task2).to.be.instanceOf(Task);
    expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  });

  test('operator-based filters', async () => {
    const { db: database } = await createDbWithTypes();

    database.add(create(Task, { title: 'foo 1' }));
    database.add(create(Task, { title: 'foo 2' }));
    database.add(create(Task, { title: 'bar 3' }));

    expect(database.query(Filter.schema(Task, (task) => task.title?.startsWith('foo'))).objects).to.have.length(2);
  });

  test('typenames of nested objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = create(Task, {
      title: 'Main task',
      todos: [create(Todo, { name: 'Sub task' })],
    });
    database.add(task);

    console.log(task.todos![0]);
    expect(typeOf(task.todos![0] as any)?.itemId).to.eq('example.test.Task.Todo');
    expect(JSON.parse(JSON.stringify(task.todos![0]))['@type'].itemId).to.eq('example.test.Task.Todo');
  });
});

const createDbWithTypes = async () => {
  const graph = new Hypergraph();
  graph.schemaRegistry.registerSchema(Task, Contact, Container, Todo);
  return createDatabase(graph);
};
