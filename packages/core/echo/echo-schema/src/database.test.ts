//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import { inspect } from 'node:util';

import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { getAutomergeObjectCore } from './automerge';
import { create, Expando, getMeta, getSchema, getType, type ReactiveObject } from './ddl';
import { clone } from './echo-handler';
import { Hypergraph } from './hypergraph';
import { Filter } from './query';
import { createDatabase, TestBuilder, Contact, Container, RecordType, Task, Todo } from './testing';

// TODO(burdon): Normalize tests to use common graph data (see query.test.ts).

describe('Database', () => {
  test('flush with test builder', async () => {
    const testBuilder = new TestBuilder();
    const peer = await testBuilder.createPeer();
    peer.db.add(create(Expando, { str: 'test' }));
    await testBuilder.flushAll();
  });

  test('inspect', async () => {
    const { db } = await createDatabase();

    const task = create(Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: create(Expando, { name: 'Bob' }),
    });
    db.add(task);
    await db.flush();

    inspect(task);
  });

  test('query by id', async () => {
    const { db } = await createDatabase();

    const n = 10;
    for (const _ of Array.from({ length: n })) {
      const obj = create(Expando, {});
      db.add(obj);
    }
    await db.flush();

    {
      const { objects } = await db.query().run();
      expect(objects.length).to.eq(n);
    }

    db.remove((await db.query().run()).objects[0]);
    await db.flush();

    {
      const { objects } = await db.query().run();
      expect(objects.length).to.eq(n - 1);
    }
  });

  test('meta', async () => {
    const { db } = await createDatabase();

    const obj = create(Expando, {});
    expectObjects(getMeta(obj).keys, []);
    getMeta(obj).keys = [{ id: 'test-key', source: 'test' }];
    expectObjects(getMeta(obj).keys, [{ id: 'test-key', source: 'test' }]);

    db.add(obj);
    await db.flush();

    expectObjects(getMeta(obj).keys, [{ id: 'test-key', source: 'test' }]);
  });

  test('creating objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = create(Task, { title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(() => getAutomergeObjectCore(task)).to.throw();
    expect(getSchema(task)?.ast).to.eq(Task.ast);
    expect(getType(task)?.itemId).to.eq('example.test.Task');

    database.add(task);
    await database.flush();
    expect(getAutomergeObjectCore(task).database).to.exist;

    const { objects: tasks } = await database.query(Filter.schema(Task)).run();
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
      const { objects } = await database.query(Filter.schema(Container)).run();
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
      const { objects } = await database.query(Filter.schema(Container)).run();
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
      const { objects } = await database.query(Filter.schema(Container)).run();
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(getType(container.objects![0])?.itemId).to.equal(Task.typename);
      expect(getType(container.objects![1])?.itemId).to.equal(Contact.typename);
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

    expect(
      (await database.query(Filter.schema(Task, (task: Task) => task.title?.startsWith('foo'))).run()).objects,
    ).to.have.length(2);
  });

  test('typenames of nested objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = create(Task, {
      title: 'Main task',
      todos: [create(Todo, { name: 'Sub task' })],
    });
    database.add(task);

    console.log(task.todos![0]);
    expect(getType(task.todos![0] as any)?.itemId).to.eq('example.test.Task.Todo');
    expect(JSON.parse(JSON.stringify(task.todos![0]))['@type'].itemId).to.eq('example.test.Task.Todo');
  });

  describe('object collections', () => {
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
      const queriedContainer = (await db.query(Filter.schema(Container)).run()).objects[0]!;
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
});

const expectObjects = (echoObjects: any[], expectedObjects: any) => {
  expect(mapEchoToPlainJsObject(echoObjects)).to.deep.eq(expectedObjects);
};

const mapEchoToPlainJsObject = (array: any[]): any[] => {
  return array.map((o) => (Array.isArray(o) ? mapEchoToPlainJsObject(o) : { ...o }));
};

const newTask = () => create(Task, { subTasks: [] });

const createDbWithTypes = async () => {
  const graph = new Hypergraph();
  graph.runtimeSchemaRegistry.registerSchema(Task, Contact, Container, Todo);
  return createDatabase(graph);
};

const addToDatabase = async <T>(obj: ReactiveObject<T>) => {
  const { db } = await createDbWithTypes();
  db.add(obj);
  await db.flush();
  return { db, obj };
};
