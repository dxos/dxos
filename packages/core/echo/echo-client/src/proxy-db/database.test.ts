//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { Error as EchoError, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { clone, getObjectCore } from '../echo-handler/index.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';
import { EchoTestBuilder, createTmpPath } from '../testing/index.ts';

/** Narrows `db.rootUrl` once at the point the database is known to have persisted its root, per `no-casts`. */
const getRootUrl = (db: DatabaseImpl): string => {
  invariant(db.rootUrl, 'Database has no rootUrl.');
  return db.rootUrl;
};

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

    const objects = await db.query(Query.select(Filter.nothing())).run();
    expect(objects).to.have.length(0);
    await db.close();
  });

  test('flush', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    db.add(Obj.make(TestSchema.Expando, { name: 'Test' }));
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
      const testPeer = await testBuilder.createPeer({
        storagePath: tmpPath,
      });
      const db = await testPeer.createDatabase();
      spaceKey = db.spaceKey;
      rootUrl = getRootUrl(db);
      db.add(Obj.make(TestSchema.Expando, { name: 'Test' }));
      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(1);
      expect(objects[0].name).to.eq('Test');
      await db.flush(); // Wait for the object to be saved.
      await testPeer.close();
    }

    // Load database.
    {
      const testPeer = await testBuilder.createPeer({
        storagePath: tmpPath,
      });
      const db = await asyncTimeout(testPeer.openDatabase(spaceKey, rootUrl), 1000);
      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(1);
      expect(objects[0].name).to.eq('Test');
      await testPeer.close();
    }
  });

  test('add object multiple times', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    const obj1 = db.add(Obj.make(TestSchema.Expando, { name: 'Test' }));
    await db.flush();
    // TODO(burdon): Should fail?
    const obj2 = db.add(obj1);
    await db.flush();
    expect(obj1).to.eq(obj2);
    const objects = await db.query(Query.select(Filter.everything())).run();
    expect(objects).to.have.length(1);
  });

  test('remove object multiple times', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase();

    const obj = db.add(Obj.make(TestSchema.Expando, { name: 'Test' }));
    await db.flush();

    db.remove(obj);
    await db.flush();

    db.remove(obj);
    await db.flush();
  });

  test('inspect', async () => {
    const { db } = await builder.createDatabase();

    const task = Obj.make(TestSchema.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      // Note: Using plain object for nested data. For typed object references, use Ref.make.
      assignee: { name: 'Test' },
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
        db.add(Obj.make(TestSchema.Expando, {}));
      }
      await db.flush();

      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects.length).to.eq(add);
    }

    // Remove objects.
    const remove = 3;
    {
      const objects = await db.query(Query.select(Filter.everything())).run();
      for (const obj of objects.slice(0, remove)) {
        db.remove(obj);
      }
      await db.flush();
    }

    {
      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects.length).to.eq(add - remove);
    }
  });

  test('query by ID', async () => {
    const { db } = await builder.createDatabase();

    const obj1 = db.add(Obj.make(TestSchema.Expando, { name: 'Object 1' }));
    const obj2 = db.add(Obj.make(TestSchema.Expando, { name: 'Object 2' }));
    await db.flush();

    {
      const objects = await db.query(Filter.id(obj1.id)).run();
      expect(objects).toEqual([obj1]);
    }

    {
      const objects = await db.query(Filter.id(obj2.id)).run();
      expect(objects).toEqual([obj2]);
    }
  });

  test('query by ID async loading', async () => {
    const peer = await builder.createPeer();
    let id: string, rootUrl: string;
    const spaceKey = PublicKey.random();

    {
      const db = await peer.createDatabase(spaceKey);
      rootUrl = getRootUrl(db);

      ({ id } = db.add(Obj.make(TestSchema.Expando, { name: 'Object 1' })));
      await db.flush();
    }

    await peer.reload();

    {
      const db = await peer.openDatabase(spaceKey, rootUrl);

      // Use query.run() for async loading instead of reactive subscription.
      const results = await db.query(Filter.id(id)).run();
      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('Object 1');
    }
  });

  test('meta', async () => {
    const { db } = await builder.createDatabase();

    const obj = Obj.make(TestSchema.Expando, {});
    expectObjects([...Obj.getMeta(obj).keys], []);
    Obj.update(obj, (obj) => Obj.getMeta(obj).keys.push({ source: 'test', id: 'test-key' }));
    expectObjects([...Obj.getMeta(obj).keys], [{ source: 'test', id: 'test-key' }]);

    db.add(obj);
    await db.flush();
    expectObjects([...Obj.getMeta(obj).keys], [{ source: 'test', id: 'test-key' }]);
  });

  test('creating objects', async () => {
    const { db } = await createDbWithTypes();

    const task = Obj.make(TestSchema.Task, { title: 'test' });
    const taskType = Obj.getType(task);
    invariant(taskType, 'Task has no type.');
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(() => getObjectCore(task)).to.throw();
    expect(Type.getSchema(taskType).ast).to.eq(Type.getSchema(TestSchema.Task).ast);
    expect(Obj.getTypeURI(task)?.toString()).to.eq('dxn:com.example.type.task:0.1.0');
    expect(Obj.getTypename(task)).to.eq('com.example.type.task');

    db.add(task);
    await db.flush();
    expect(getObjectCore(task).entityManager).to.exist;

    const tasks = await db.query(Filter.type(TestSchema.Task)).run();
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  test('enums', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = Obj.make(TestSchema.Container, {
        records: [{ type: TestSchema.RecordType.WORK }],
      });
      db.add(container);
    }

    {
      const objects = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      const { records } = container;
      invariant(records);
      expect(records).to.have.length(1);
      expect(records[0].type).to.eq(TestSchema.RecordType.WORK);
    }
  });

  test('dxoSchema.Schema.Expando', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = db.add(Obj.make(TestSchema.Container, { objects: [] }));
      await db.flush();

      Obj.update(container, (container) => {
        const { objects } = container;
        invariant(objects);
        objects.push(Ref.make(Obj.make(TestSchema.Expando, { foo: 100 })));
        objects.push(Ref.make(Obj.make(TestSchema.Expando, { bar: 200 })));
      });
    }

    {
      const objects = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      const { objects: containerObjects } = container;
      invariant(containerObjects);
      expect(containerObjects).to.have.length(2);
      const target1 = await containerObjects[0].load();
      const target2 = await containerObjects[1].load();
      invariant(Obj.instanceOf(TestSchema.Expando, target1));
      invariant(Obj.instanceOf(TestSchema.Expando, target2));
      expect(target1.foo).to.equal(100);
      expect(target2.bar).to.equal(200);
    }
  });

  test('dxoSchema.Schema.TextObject', async () => {
    const { db } = await createDbWithTypes();

    {
      const container = db.add(Obj.make(TestSchema.Container, { objects: [] }));
      await db.flush();

      Obj.update(container, (container) => {
        const { objects } = container;
        invariant(objects);
        objects.push(Ref.make(Obj.make(TestSchema.Task, {})));
        objects.push(Ref.make(Obj.make(TestSchema.Person, {})));
      });
    }

    {
      const objects = await db.query(Filter.type(TestSchema.Container)).run();
      const [container] = objects;
      const { objects: containerObjects } = container;
      invariant(containerObjects);
      expect(containerObjects).to.have.length(2);
      const [taskTarget, personTarget] = [containerObjects[0].target, containerObjects[1].target];
      invariant(taskTarget);
      invariant(personTarget);
      expect(Obj.getTypename(taskTarget)).to.equal(Type.getTypename(TestSchema.Task));
      expect(Obj.getTypename(personTarget)).to.equal(Type.getTypename(TestSchema.Person));
    }
  });

  test('object fields', async () => {
    const task = Obj.make(TestSchema.Task, {});

    Obj.update(task, (task) => {
      task.title = 'test';
    });
    expect(task.title).to.eq('test');
    expect(Obj.getMeta(task).keys).to.have.length(0);

    Obj.update(task, (task) => Obj.getMeta(task).keys.push({ source: 'example', id: 'test' }));
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
      const secondTask = db.add(
        Obj.make(TestSchema.Task, {
          title: 'bar',
          previous: Ref.make(firstTask),
        }),
      );
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

    const { subTasks } = task;
    invariant(subTasks);
    const subTaskTarget = subTasks[0].target;
    invariant(subTaskTarget);
    expect(Obj.getTypename(subTaskTarget)).to.eq('com.example.type.task');
    expect(JSON.parse(JSON.stringify(subTasks[0].target))['@type']).to.eq('dxn:com.example.type.task:0.1.0');
  });

  test('versions', async () => {
    const { db } = await createDbWithTypes();
    const task = db.add(Obj.make(TestSchema.Task, { title: 'Main task' }));
    const version1 = Obj.version(task);
    expect(Obj.isVersion(version1)).to.be.true;
    expect(Obj.versionValid(version1)).to.be.true;

    const version2 = Obj.version(task);
    expect(Obj.isVersion(version2)).to.be.true;
    expect(Obj.versionValid(version2)).to.be.true;
    expect(Obj.compareVersions(version1, version2)).to.eq('equal');

    Obj.update(task, (task) => {
      task.title = 'Main task 2';
    });
    const version3 = Obj.version(task);
    expect(Obj.isVersion(version3)).to.be.true;
    expect(Obj.versionValid(version3)).to.be.true;
    expect(Obj.compareVersions(version1, version3)).to.eq('different');
    expect(Obj.compareVersions(version2, version3)).to.eq('different');
  });

  describe('object collections', () => {
    test('assignment', async () => {
      const root = Obj.make(TestSchema.Task, { subTasks: [] });
      expect(root.subTasks).to.have.length(0);

      Obj.update(root, (root) => {
        const { subTasks } = root;
        invariant(subTasks);
        range(3).forEach(() => subTasks.push(Ref.make(Obj.make(TestSchema.Task, { subTasks: [] }))));
        subTasks.push(
          Ref.make(Obj.make(TestSchema.Task, { subTasks: [] })),
          Ref.make(Obj.make(TestSchema.Task, { subTasks: [] })),
        );
      });

      const { subTasks } = root;
      invariant(subTasks);
      expect(subTasks).to.have.length(5);
      expect(subTasks.length).to.eq(5);
      expect(JSON.parse(JSON.stringify(root, undefined, 2)).subTasks).to.have.length(5);

      // Iterators.
      const targetId = (task: (typeof subTasks)[number]) => {
        invariant(task.target);
        return task.target.id;
      };
      const ids = subTasks.map(targetId);
      subTasks.forEach((task, i) => expect(targetId(task)).to.eq(ids[i]));
      expect(Array.from(subTasks.values())).to.have.length(5);

      Obj.update(root, (root) => {
        root.subTasks = [
          Ref.make(Obj.make(TestSchema.Task, {})),
          Ref.make(Obj.make(TestSchema.Task, {})),
          Ref.make(Obj.make(TestSchema.Task, {})),
        ];
      });
      const { subTasks: updatedSubTasks } = root;
      invariant(updatedSubTasks);
      expect(updatedSubTasks.length).to.eq(3);

      await addToDatabase(root);
    });

    test('splice', async () => {
      const root = Obj.make(TestSchema.Task, { subTasks: [] });
      Obj.update(root, (root) => {
        root.subTasks = range(3).map((_i) => Ref.make(Obj.make(TestSchema.Task, { subTasks: [] })));
      });
      Obj.update(root, (root) => {
        const { subTasks } = root;
        invariant(subTasks);
        subTasks.splice(0, 2, Ref.make(Obj.make(TestSchema.Task, { subTasks: [] })));
      });
      expect(root.subTasks).to.have.length(2);
      await addToDatabase(root);
    });

    test('array of plain objects', async () => {
      const root = Obj.make(TestSchema.Container, { records: [] });
      Obj.update(root, (root) => {
        const { records } = root;
        invariant(records);
        records.push({
          title: 'test',
          contacts: [Ref.make(Obj.make(TestSchema.Person, { name: 'tester' }))],
        });
      });
      const { db } = await addToDatabase(root);

      expect(root.records).to.have.length(1);
      const [queriedContainer] = await db.query(Filter.type(TestSchema.Container)).run();
      invariant(queriedContainer);
      const { records: queriedRecords } = queriedContainer;
      invariant(queriedRecords);
      expect(queriedRecords.length).to.equal(1);
      const [record] = queriedRecords;
      invariant(record);
      const { contacts } = record;
      invariant(contacts);
      const [contact] = contacts;
      invariant(contact);
      invariant(contact.target);
      expect(contact.target.name).to.equal('tester');
    });

    test('reset array', async () => {
      const { db, obj: root } = await addToDatabase(Obj.make(TestSchema.Container, { records: [] }));

      Obj.update(root, (root) => {
        const { records } = root;
        invariant(records);
        records.push({ title: 'one' });
      });
      expect(root.records).to.have.length(1);

      Obj.update(root, (root) => {
        root.records = [];
      });
      expect(root.records).to.have.length(0);
      await db.flush();
      expect(root.records).to.have.length(0);

      Obj.update(root, (root) => {
        const { records } = root;
        invariant(records);
        records.push({ title: 'two' });
      });
      expect(root.records).to.have.length(1);
      await db.flush();
      expect(root.records).to.have.length(1);
    });
  });

  const createDbWithTypes = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task, TestSchema.Person, TestSchema.Container]);
    return { db, graph };
  };

  const addToDatabase = async <T extends Obj.Unknown>(obj: T) => {
    const { db } = await createDbWithTypes();
    db.add(obj);
    await db.flush();
    return { db, obj };
  };

  describe('Obj.getReactive', () => {
    test('returns reactive object when snapshot has database and object exists', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      const result = Obj.getReactive(snapshot).pipe(Effect.runSync);

      expect(result).toBe(obj);
      expect(result.name).toBe('Test');
    });

    test('fails with no-database when snapshot has no database', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      const exit = Effect.runSyncExit(Obj.getReactive(snapshot));
      if (!Exit.isFailure(exit)) {
        throw new Error('Expected failure');
      }
      const failures = exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error);
      expect(failures.length).toBeGreaterThan(0);
      const error = failures[0];
      expect(EchoError.GetReactiveError.is(error)).toBe(true);
      expect((error as EchoError.GetReactiveError).context?.reason).toBe('no-database');
    });

    test('fails with object-not-found when object was removed from database', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      db.remove(obj);

      const exit = Effect.runSyncExit(Obj.getReactive(snapshot));
      if (!Exit.isFailure(exit)) {
        throw new Error('Expected failure');
      }
      const failures = exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error);
      expect(failures.length).toBeGreaterThan(0);
      const error = failures[0];
      expect(EchoError.GetReactiveError.is(error)).toBe(true);
      expect((error as EchoError.GetReactiveError).context?.reason).toBe('object-not-found');
      expect((error as EchoError.GetReactiveError).context?.snapshotId).toBe(obj.id);
    });
  });

  describe('Obj.getReactiveOption', () => {
    test('returns Option.some when snapshot has database and object exists', async () => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      const result = Obj.getReactiveOption(snapshot).pipe(Effect.runSync);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe(obj);
      expect(Option.getOrThrow(result).name).toBe('Test');
    });

    test('returns Option.none when snapshot has no database', async () => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      const result = Obj.getReactiveOption(snapshot).pipe(Effect.runSync);

      expect(Option.isNone(result)).toBe(true);
    });

    test('returns Option.none when object was removed from database', async () => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      db.remove(obj);

      const result = Obj.getReactiveOption(snapshot).pipe(Effect.runSync);

      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('ref atom deletion reactivity', () => {
    test('ref.atom fires and resolves to undefined when target is removed', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const registry = AtomRegistry.make();

      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const ref = Ref.make(obj);

      let fireCount = 0;
      registry.subscribe(ref.atom, () => {
        fireCount++;
      });

      expect(registry.get(ref.atom)).toBe(obj);

      db.remove(obj);

      expect(fireCount).toBeGreaterThan(0);
      expect(registry.get(ref.atom)).toBeUndefined();
    });

    test('Obj.atom(ref) fires and resolves to undefined when target is removed', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const registry = AtomRegistry.make();

      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const ref = Ref.make(obj);

      const atom = Obj.atom(ref);
      let fireCount = 0;
      registry.subscribe(atom, () => {
        fireCount++;
      });

      expect(registry.get(atom)).not.toBeUndefined();

      db.remove(obj);

      expect(fireCount).toBeGreaterThan(0);
      expect(registry.get(atom)).toBeUndefined();
    });

    test('Obj.atomReactive(ref) fires and resolves to undefined when target is removed', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const registry = AtomRegistry.make();

      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const ref = Ref.make(obj);

      const atom = Obj.atomReactive(ref);
      let fireCount = 0;
      registry.subscribe(atom, () => {
        fireCount++;
      });

      expect(registry.get(atom)).toBe(obj);

      db.remove(obj);

      expect(fireCount).toBeGreaterThan(0);
      expect(registry.get(atom)).toBeUndefined();
    });
  });

  describe('Obj.getReactiveOrThrow', () => {
    test('returns reactive object when snapshot has database and object exists', async () => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      const result = Obj.getReactiveOrThrow(snapshot);

      expect(result).toBe(obj);
      expect(result.name).toBe('Test');
    });

    test('throws GetReactiveError with no-database when snapshot has no database', async () => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      try {
        Obj.getReactiveOrThrow(snapshot);
        expect.fail('Expected throw');
      } catch (error) {
        expect(EchoError.GetReactiveError.is(error)).toBe(true);
        expect((error as EchoError.GetReactiveError).context?.reason).toBe('no-database');
      }
    });

    test('throws GetReactiveError with object-not-found when object was removed from database', async () => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });
      const obj = db.add(Obj.make(TestSchema.Person, { name: 'Test' }));
      const snapshot = Obj.getSnapshot(obj);

      db.remove(obj);

      try {
        Obj.getReactiveOrThrow(snapshot);
        expect.fail('Expected throw');
      } catch (error) {
        expect(EchoError.GetReactiveError.is(error)).toBe(true);
        expect((error as EchoError.GetReactiveError).context?.reason).toBe('object-not-found');
        expect((error as EchoError.GetReactiveError).context?.snapshotId).toBe(obj.id);
      }
    });
  });
});

const expectObjects = <T>(echoObjects: readonly T[], expectedObjects: unknown): void => {
  expect(mapEchoToPlainJsObject(echoObjects)).to.deep.eq(expectedObjects);
};

const mapEchoToPlainJsObject = <T>(array: readonly T[]): unknown[] => {
  return array.map((entry) => (Array.isArray(entry) ? mapEchoToPlainJsObject(entry) : { ...entry }));
};
