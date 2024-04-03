//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Contact, Container, RecordType, Task, Todo } from './schema';
import { getAutomergeObjectCore } from '../automerge';
import * as E from '../effect/reactive';
import { Hypergraph } from '../hypergraph';
// import { clone, getTextContent } from '../object';
import { Filter } from '../query';
import { createDatabase } from '../testing';

// TODO(burdon): Reconcile/document tests in parent folder.

describe('database', () => {
  test('creating objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = E.object(Task, { title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(getAutomergeObjectCore(task)).to.be.undefined;
    expect(E.getSchema(task)?.ast).to.eq(Task.ast);
    expect(E.typeOf(task)?.itemId).to.eq('example.test.Task');

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
      const container = E.object(Container, { records: [{ type: RecordType.WORK }] });
      await database.add(container);
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.records).to.have.length(1);
      expect(container.records![0].type).to.eq(RecordType.WORK);
    }
  });

  describe('dxos.schema.Text', () => {
    test('text objects are auto-created on schema', async () => {
      // const { db: database } = await createDbWithTypes();
      //
      // const task = E.object(Task, { description: E.object(TextCompatibilitySchema, { content: '' }) });
      // expect(task.description instanceof TextCompatibilitySchema).to.be.true;
      //
      // database.add(task);
      // await database.flush();
      // expect(task.description instanceof TextCompatibilitySchema).to.be.true;
      //
      // (task.description as any).content = 'test';
      // expect(getTextContent(task.description)).to.eq('test');
    });
  });

  test('dxos.schema.Expando', async () => {
    const { db: database } = await createDbWithTypes();

    {
      const container = E.object(Container, { expandos: [] });
      database.add(container);
      await database.flush();

      container.expandos!.push(E.object(E.ExpandoType, { foo: 100 }));
      container.expandos!.push(E.object(E.ExpandoType, { bar: 200 }));
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.expandos).to.have.length(2);
      expect(container.expandos![0]!.foo).to.equal(100);
      expect(container.expandos![1]!.bar).to.equal(200);
    }
  });

  test('dxos.schema.TextObject', async () => {
    const { db: database } = await createDbWithTypes();

    {
      const container = E.object(Container, { objects: [] });
      database.add(container);
      await database.flush();

      container.objects!.push(E.object(Task, {}));
      container.objects!.push(E.object(Contact, {}));
    }

    {
      const { objects } = database.query(Filter.schema(Container));
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(E.typeOf(container.objects![0])?.itemId).to.equal(Task.typename);
      expect(E.typeOf(container.objects![1])?.itemId).to.equal(Contact.typename);
    }
  });

  test('object fields', async () => {
    const task = E.object(Task, {});

    task.title = 'test';
    expect(task.title).to.eq('test');
    expect(E.metaOf(task).keys).to.have.length(0);

    E.metaOf(task).keys.push({ source: 'example', id: 'test' });
    expect(E.metaOf(task).keys).to.have.length(1);
  });

  test('clone', async () => {
    const { db: db1 } = await createDbWithTypes();
    const { db: db2 } = await createDbWithTypes();

    const task1 = E.object(Task, { title: 'Main task' });
    db1.add(task1);
    await db1.flush();

    // const task2 = clone(task1);
    // expect(task2 !== task1).to.be.true;
    // expect(task2.id).to.equal(task1.id);
    // expect(task2.title).to.equal(task1.title);
    // expect(task2).to.be.instanceOf(Task);
    //
    // db2.add(task2);
    // await db2.flush();
    // expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  });

  test('operator-based filters', async () => {
    const { db: database } = await createDbWithTypes();

    database.add(E.object(Task, { title: 'foo 1' }));
    database.add(E.object(Task, { title: 'foo 2' }));
    database.add(E.object(Task, { title: 'bar 3' }));

    expect(database.query(Filter.schema(Task, (task) => task.title.startsWith('foo'))).objects).to.have.length(2);
  });

  test('typenames of nested objects', async () => {
    const { db: database } = await createDbWithTypes();

    const task = E.object(Task, {
      title: 'Main task',
      todos: [E.object(Todo, { name: 'Sub task' })],
    });
    database.add(task);

    console.log(task.todos![0]);
    expect(E.typeOf(task.todos![0] as any)?.itemId).to.eq('example.test.Task.Todo');
    expect(JSON.parse(JSON.stringify(task.todos![0]))['@type'].itemId).to.eq('example.test.Task.Todo');
  });
});

const createDbWithTypes = async () => {
  const graph = new Hypergraph();
  graph.types.registerEffectSchema(Task, Contact, Container, Todo);
  return createDatabase(graph);
};
