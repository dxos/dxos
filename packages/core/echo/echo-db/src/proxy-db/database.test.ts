//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { Obj, Query, Ref, Type } from '@dxos/echo';
import { TestSchema, updateCounter } from '@dxos/echo/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { clone, getObjectCore } from '../echo-handler';
import { Filter } from '../query';
import { EchoTestBuilder, createTmpPath } from '../testing';

// TODO(burdon): Normalize tests to use common graph data (see query.test.ts).

describe('Database', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create database and query nothing', async () => {
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(PublicKey.random(), {
      reactiveSchemaQuery: false,
      preloadSchemaOnOpen: false,
    });

    const { objects } = await db.query(Query.select(Filter.nothing())).run();
    expect(objects).to.have.length(0);
    await db.close();
  });

  test('flush', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await db.flush();
  });

  test('db is persisted to storage without a flush', { timeout: 100000 }, async () => {
    const tmpPath = createTmpPath();
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);

    // Create database.
    let spaceKey: PublicKey;
    let rootUrl: string;
    {
      const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await testPeer.createDatabase();
      spaceKey = db.spaceKey;
      rootUrl = db.rootUrl!;
      db.add(Obj.make(Type.Expando, { name: 'Test' }));
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(1);
      expect(objects[0].name).to.eq('Test');
      await sleep(500); // Wait for the object to be saved.
      await testPeer.close();
    }

    // Load database.
    {
      const testPeer = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await asyncTimeout(testPeer.openDatabase(spaceKey, rootUrl), 1000);
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(1);
      expect(objects[0].name).to.eq('Test');
      await testPeer.close();
    }
  });

  test('add object multiple times', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    const obj1 = db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await db.flush();
    // TODO(burdon): Should fail?
    const obj2 = db.add(obj1);
    await db.flush();
    expect(obj1).to.eq(obj2);
    const { objects } = await db.query(Query.select(Filter.everything())).run();
    expect(objects).to.have.length(1);
  });

  test('remove object multiple times', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    const obj = db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await db.flush();

    db.remove(obj);
    await db.flush();

    db.remove(obj);
    await db.flush();
  });

  test('inspect', async () => {
    const { db } = await builder.createDatabase();

    const task = Obj.make(Type.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: Obj.make(Type.Expando, { name: 'Test' }),
    });
    db.add(task);
    await db.flush();

    const value = inspect(task);
    expect(typeof value).to.eq('string');
  });

  test('add and remove objects', async () => {
    const { db } = await builder.createDatabase();

    // Add objects.
    const add = 10;
    {
      for (const _ of Array.from({ length: add })) {
        db.add(Obj.make(Type.Expando, {}));
      }
      await db.flush();

      const { objects } = await db.query(Query.select(Filter.everything())).run();
      expect(objects.length).to.eq(add);
    }

    // Remove objects.
    const remove = 3;
    {
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      for (const obj of objects.slice(0, remove)) {
        db.remove(obj);
      }
      await db.flush();
    }

    {
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      expect(objects.length).to.eq(add - remove);
    }
  });

  test('query by ID', async () => {
    const { db } = await builder.createDatabase();

    const obj1 = db.add(Obj.make(Type.Expando, { name: 'Object 1' }));
    const obj2 = db.add(Obj.make(Type.Expando, { name: 'Object 2' }));
    await db.flush({ indexes: true });

    {
      const { objects } = await db.query(Filter.ids(obj1.id)).run();
      expect(objects).toEqual([obj1]);
    }

    {
      const { objects } = await db.query(Filter.ids(obj2.id)).run();
      expect(objects).toEqual([obj2]);
    }
  });

  test('query by ID async loading with signals', async () => {
    registerSignalsRuntime();
    const peer = await builder.createPeer();
    let id: string, rootUrl: string;
    const spaceKey = PublicKey.random();

    {
      const db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl!;

      ({ id } = db.add(Obj.make(Type.Expando, { name: 'Object 1' })));
      await db.flush();
    }

    await peer.reload();

    {
      const db = await peer.openDatabase(spaceKey, rootUrl);

      const query = db.query(Filter.ids(id));
      const loaded = new Trigger();
      query.subscribe();
      using updates = updateCounter(() => {
        if (query.objects.length > 0) {
          loaded.wake();
        }
      });

      expect(query.objects).toHaveLength(0);
      expect(updates.count).toEqual(0);

      await loaded.wait();
      expect(updates.count).toBeGreaterThan(0);
      expect(query.objects).toHaveLength(1);
      expect(query.objects[0].name).toEqual('Object 1');
    }
  });

  test('meta', async () => {
    const { db } = await builder.createDatabase();

    const obj = Obj.make(Type.Expando, {});
    expectObjects(Obj.getMeta(obj).keys, []);
    Obj.getMeta(obj).keys.push({ source: 'test', id: 'test-key' });
    expectObjects(Obj.getMeta(obj).keys, [{ source: 'test', id: 'test-key' }]);

    db.add(obj);
    await db.flush();
    expectObjects(Obj.getMeta(obj).keys, [{ source: 'test', id: 'test-key' }]);
  });

  test('creating objects', async () => {
    const { db } = await createDbWithTypes();

    const task = Obj.make(TestSchema.Task, { title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(() => getObjectCore(task)).to.throw();
    expect(Obj.getSchema(task)?.ast).to.eq(TestSchema.Task.ast);
    expect(Obj.getTypeDXN(task)?.toString()).to.eq('dxn:type:example.com/type/Task:0.1.0');
    expect(Obj.getTypename(task)).to.eq('example.com/type/Task');

    db.add(task);
    await db.flush();
    expect(getObjectCore(task).database).to.exist;

    const { objects: tasks } = await db.query(Filter.type(TestSchema.Task)).run();
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  test('enums', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = Obj.make(TestSchema.Container, { records: [{ type: TestSchema.RecordType.WORK }] });
      db.add(container);
    }

    {
      const { objects } = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      expect(container.records).to.have.length(1);
      expect(container.records![0].type).to.eq(TestSchema.RecordType.WORK);
    }
  });

  test('dxoSchema.Schema.Expando', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = db.add(Obj.make(TestSchema.Container, { objects: [] }));
      await db.flush();

      container.objects!.push(Ref.make(Obj.make(Type.Expando, { foo: 100 })));
      container.objects!.push(Ref.make(Obj.make(Type.Expando, { bar: 200 })));
    }

    {
      const { objects } = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      const target1 = await container.objects![0].load();
      const target2 = await container.objects![1].load();
      // TODO(wittjosiah): Fix.
      // assert(Obj.instanceOf(Type.Expando, target1));
      // assert(Obj.instanceOf(Type.Expando, target2));
      expect((target1 as any).foo).to.equal(100);
      expect((target2 as any).bar).to.equal(200);
    }
  });

  test('dxoSchema.Schema.TextObject', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = db.add(Obj.make(TestSchema.Container, { objects: [] }));
      await db.flush();

      container.objects!.push(Ref.make(Obj.make(TestSchema.Task, {})));
      container.objects!.push(Ref.make(Obj.make(TestSchema.Person, {})));
    }

    {
      const { objects } = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      expect(container.objects).to.have.length(2);
      expect(Obj.getTypename(container.objects![0].target!)).to.equal(Type.getTypename(TestSchema.Task));
      expect(Obj.getTypename(container.objects![1].target!)).to.equal(Type.getTypename(TestSchema.Person));
    }
  });

  test('object fields', async () => {
    const task = Obj.make(TestSchema.Task, {});

    task.title = 'test';
    expect(task.title).to.eq('test');
    expect(Obj.getMeta(task).keys).to.have.length(0);

    Obj.getMeta(task).keys.push({ source: 'example', id: 'test' });
    expect(Obj.getMeta(task).keys).to.have.length(1);
  });

  test('clone', async () => {
    const { db: db1 } = await createDbWithTypes();
    const { db: db2 } = await createDbWithTypes();

    const task1 = Obj.make(TestSchema.Task, { title: 'Main task' });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1);
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);

    db2.add(task2);
    await db2.flush();
    expect(Obj.instanceOf(TestSchema.Task, task2)).to.be.true;
    expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  });

  describe('references', () => {
    test('add with a reference to echo reactive proxy', async () => {
      const { db } = await createDbWithTypes();
      const firstTask = db.add(Obj.make(TestSchema.Task, { title: 'foo' }));
      const secondTask = db.add(Obj.make(TestSchema.Task, { title: 'bar', previous: Ref.make(firstTask) }));
      expect(secondTask.previous?.target).to.eq(firstTask);
    });

    test('add with a reference to a reactive proxy', async () => {
      const { db } = await createDbWithTypes();
      const task = db.add(
        Obj.make(TestSchema.Task, {
          title: 'first',
          previous: Ref.make(Obj.make(TestSchema.Task, { title: 'second' })),
        }),
      );
      expect(task.title).to.eq('first');
      expect(task.previous?.target?.id).to.be.a('string');
    });
  });

  test('typenames of nested objects', async () => {
    const { db } = await createDbWithTypes();
    const task = db.add(
      Obj.make(TestSchema.Task, {
        title: 'Main task',
        subTasks: [Ref.make(Obj.make(TestSchema.Task, { title: 'Sub task' }))],
      }),
    );

    expect(Obj.getTypename(task.subTasks![0].target!)).to.eq('example.com/type/Task');
    expect(JSON.parse(JSON.stringify(task.subTasks![0].target))['@type']).to.eq('dxn:type:example.com/type/Task:0.1.0');
  });

  test('versions', async () => {
    const { db } = await createDbWithTypes();
    const task = db.add(Obj.make(TestSchema.Task, { title: 'Main task' }));
    const version1 = Obj.version(task as any);
    expect(Obj.isVersion(version1)).to.be.true;
    expect(Obj.versionValid(version1)).to.be.true;

    const version2 = Obj.version(task as any);
    expect(Obj.isVersion(version2)).to.be.true;
    expect(Obj.versionValid(version2)).to.be.true;
    expect(Obj.compareVersions(version1, version2)).to.eq('equal');

    task.title = 'Main task 2';
    const version3 = Obj.version(task as any);
    expect(Obj.isVersion(version3)).to.be.true;
    expect(Obj.versionValid(version3)).to.be.true;
    expect(Obj.compareVersions(version1, version3)).to.eq('different');
    expect(Obj.compareVersions(version2, version3)).to.eq('different');
  });

  describe('object collections', () => {
    test('assignment', async () => {
      const root = newTask();
      expect(root.subTasks).to.have.length(0);

      range(3).forEach(() => root.subTasks!.push(Ref.make(newTask())));
      root.subTasks!.push(Ref.make(newTask()), Ref.make(newTask()));

      expect(root.subTasks).to.have.length(5);
      expect(root.subTasks!.length).to.eq(5);
      expect(JSON.parse(JSON.stringify(root, undefined, 2)).subTasks).to.have.length(5);

      // Iterators.
      const ids = root.subTasks!.map((task: any) => task.target!.id);
      root.subTasks!.forEach((task: any, i: number) => expect(task.target!.id).to.eq(ids[i]));
      expect(Array.from(root.subTasks!.values())).to.have.length(5);

      root.subTasks = [
        Ref.make(Obj.make(TestSchema.Task, {})),
        Ref.make(Obj.make(TestSchema.Task, {})),
        Ref.make(Obj.make(TestSchema.Task, {})),
      ];
      expect(root.subTasks.length).to.eq(3);

      await addToDatabase(root);
    });

    test('splice', async () => {
      const root = newTask();
      root.subTasks = range(3).map((i) => Ref.make(newTask()));
      root.subTasks.splice(0, 2, Ref.make(newTask()));
      expect(root.subTasks).to.have.length(2);
      await addToDatabase(root);
    });

    test('array of plain objects', async () => {
      const root = Obj.make(TestSchema.Container, { records: [] });
      root.records!.push({
        title: 'test',
        contacts: [Ref.make(Obj.make(TestSchema.Person, { name: 'tester' }))],
      });
      const { db } = await addToDatabase(root);

      expect(root.records).to.have.length(1);
      const queriedContainer = (await db.query(Filter.type(TestSchema.Container)).run()).objects[0]!;
      expect(queriedContainer.records!.length).to.equal(1);
      expect(queriedContainer.records![0]!.contacts![0]!.target!.name).to.equal('tester');
    });

    test('reset array', async () => {
      const { db, obj: root } = await addToDatabase(Obj.make(TestSchema.Container, { records: [] }));

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

  const createDbWithTypes = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([TestSchema.Task, TestSchema.Person, TestSchema.Container]);
    return { db, graph };
  };

  const addToDatabase = async <T extends Obj.Any>(obj: T) => {
    const { db } = await createDbWithTypes();
    db.add(obj);
    await db.flush();
    return { db, obj };
  };
});

const expectObjects = (echoObjects: any[], expectedObjects: any) => {
  expect(mapEchoToPlainJsObject(echoObjects)).to.deep.eq(expectedObjects);
};

const mapEchoToPlainJsObject = (array: any[]): any[] => {
  return array.map((o) => (Array.isArray(o) ? mapEchoToPlainJsObject(o) : { ...o }));
};

const newTask = () => Obj.make(TestSchema.Task, { subTasks: [] });
