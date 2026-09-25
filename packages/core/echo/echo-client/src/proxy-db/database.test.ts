//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Scope from 'effect/Scope';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { Database, Error as EchoError, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { RpcClosedError, makeInProcessClient } from '@dxos/protocols';
import { DataService, QueryService } from '@dxos/protocols/rpc';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { getObjectCore } from '../echo-handler/index.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '../testing/index.ts';

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

    const task2 = Obj.clone(task1, { retainId: true });
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

  test('a parent atom follows the parent edge', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] });
    const task = db.add(Obj.make(TestSchema.Task, { title: 'x' }));
    const first = db.add(Obj.make(TestSchema.Person, { name: 'first', tasks: [Ref.make(task)] }));
    const second = db.add(Obj.make(TestSchema.Person, { name: 'second', tasks: [Ref.make(task)] }));
    Obj.setParent(task, first);
    await db.flush();

    const registry = AtomRegistry.make();
    const atom = Obj.parentAtom(task);
    registry.subscribe(atom, () => {});
    expect(registry.get(atom)?.id).toBe(first.id);

    Obj.setParent(task, second);
    await expect.poll(() => registry.get(atom)?.id).toBe(second.id);
  });

  test('a property traversal returns targets in array order', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] });
    const tasks = ['one', 'two', 'three'].map((title) => db.add(Obj.make(TestSchema.Task, { title })));
    // Reversed against creation, so the array order cannot coincide with id order.
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice', tasks: tasks.toReversed().map(Ref.make) }));
    await db.flush();

    const results = await db.query(Query.select(Filter.entity(person)).reference('tasks')).run();
    expect(results.map((task) => task.title)).toEqual(['three', 'two', 'one']);
  });

  test('a property traversal follows the array as it is reordered and extended', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] });
    const tasks = ['one', 'two', 'three'].map((title) => db.add(Obj.make(TestSchema.Task, { title })));
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice', tasks: tasks.map(Ref.make) }));
    await db.flush();

    const registry = AtomRegistry.make();
    const atom = db.query(Query.select(Filter.entity(person)).reference('tasks')).atom;
    registry.subscribe(atom, () => {});
    const titles = () => registry.get(atom).map((task) => task.title);
    await expect.poll(titles).toEqual(['one', 'two', 'three']);

    Obj.update(person, (person) => {
      person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];
    });
    await expect.poll(titles).toEqual(['three', 'one', 'two']);

    const four = db.add(Obj.make(TestSchema.Task, { title: 'four' }));
    Obj.update(person, (person) => {
      person.tasks!.push(Ref.make(four));
    });
    await expect.poll(titles).toEqual(['three', 'one', 'two', 'four']);
  });

  describe('loading deleted targets', () => {
    // Refs read back off the holder carry no inlined target, so these exercise the resolver.
    const setup = async () => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] });
      const tasks = ['one', 'two', 'three'].map((title) => db.add(Obj.make(TestSchema.Task, { title })));
      const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice', tasks: tasks.map((task) => Ref.make(task)) }));
      await db.flush();
      invariant(person.tasks, 'Person has no tasks.');
      return { db, person, tasks, refs: person.tasks };
    };

    test('ref.load fails for a deleted target and resolves it when deleted are included', async ({ expect }) => {
      const { db, refs, tasks } = await setup();
      db.remove(tasks[0]);

      const [ref] = refs;
      expect(ref.target).toBeUndefined();
      await expect(ref.load()).rejects.toThrow();
      await expect(ref.tryLoad()).resolves.toBeUndefined();
      expect(await ref.load({ deleted: 'include' })).toMatchObject({ id: tasks[0].id });
    });

    test('an inlined target is checked too', async ({ expect }) => {
      const { db, tasks } = await setup();
      const ref = Ref.make(tasks[0]);
      db.remove(tasks[0]);

      await expect(ref.load()).rejects.toThrow();
      expect(await ref.load({ deleted: 'include' })).toMatchObject({ id: tasks[0].id });
    });

    test('Database.load fails with EntityNotFoundError for a deleted target', async ({ expect }) => {
      const { db, refs, tasks } = await setup();
      db.remove(tasks[0]);

      const [ref] = refs;
      const exit = await Effect.runPromiseExit(Database.load(ref));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(await EffectEx.runPromise(Database.load(ref, { deleted: 'include' }))).toMatchObject({ id: tasks[0].id });
    });

    test('a property traversal drops a deleted target', async ({ expect }) => {
      const { db, person, tasks } = await setup();
      db.remove(tasks[1]);

      const titles = await db
        .query(Query.select(Filter.entity(person)).reference('tasks'))
        .run()
        .then((results) => results.map((task) => task.title));
      expect(titles.toSorted()).toEqual(['one', 'three']);
    });

    test('the ref atom family is keyed structurally', async ({ expect }) => {
      const { person } = await setup();
      // Separate reads: each yields a fresh Ref instance addressing the same target.
      const [first] = person.tasks ?? [];
      const [second] = person.tasks ?? [];

      expect(Obj.atom(first)).toBe(Obj.atom(second));
      expect(Obj.atom(first, { deleted: 'include' })).toBe(Obj.atom(second, { deleted: 'include' }));
      expect(Obj.atom(first)).not.toBe(Obj.atom(first, { deleted: 'include' }));
    });

    test('Obj.atom(ref, { deleted: "include" }) resolves a target removed before the atom is read', async ({
      expect,
    }) => {
      const { db, refs, tasks } = await setup();
      const registry = AtomRegistry.make();
      const [ref] = refs;
      db.remove(tasks[0]);

      const atom = Obj.atom(ref, { deleted: 'include' });
      registry.subscribe(atom, () => {});
      await expect.poll(() => registry.get(atom)).toMatchObject({ id: tasks[0].id });
    });

    test('Obj.atom(ref, { deleted: "include" }) keeps a removed target', async ({ expect }) => {
      const { db, refs, tasks } = await setup();
      const registry = AtomRegistry.make();
      const [ref] = refs;

      const atom = Obj.atom(ref, { deleted: 'include' });
      expect(registry.get(atom)).not.toBeUndefined();

      db.remove(tasks[0]);

      expect(registry.get(atom)).toMatchObject({ id: tasks[0].id });
      expect(registry.get(Obj.atom(ref))).toBeUndefined();
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

  describe('flush over a lost connection', () => {
    test('an object added before the service disconnects makes flush throw', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      await db.flush();

      const connection = await connectServices(peer);
      db.add(Obj.make(TestSchema.Expando, { name: 'added' }));
      connection.disconnect();

      await expect(db.flush({ indexes: false })).rejects.toThrow(RpcClosedError);
    });

    test('an update made before the service disconnects makes flush throw', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const existing = db.add(Obj.make(TestSchema.Expando, { name: 'before' }));
      await db.flush();

      const connection = await connectServices(peer);
      Obj.update(existing, (existing) => {
        existing.name = 'after';
      });
      connection.disconnect();

      await expect(db.flush({ indexes: false })).rejects.toThrow(RpcClosedError);
    });

    test('an object added while the service is disconnected reaches the host after it reconnects', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      await db.flush();

      const connection = await connectServices(peer);
      connection.disconnect();
      db.add(Obj.make(TestSchema.Expando, { name: 'added while disconnected' }));
      await expect(db.flush({ indexes: false })).rejects.toThrow();

      await connection.reconnect();
      await db.flush();

      const reader = await peer.openLastDatabase({ client: await peer.createClient() });
      const names = (await reader.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.name);
      expect(names).toContain('added while disconnected');
    });
  });
});

const expectObjects = <T>(echoObjects: readonly T[], expectedObjects: unknown): void => {
  expect(mapEchoToPlainJsObject(echoObjects)).to.deep.eq(expectedObjects);
};

const mapEchoToPlainJsObject = <T>(array: readonly T[]): unknown[] => {
  return array.map((entry) => (Array.isArray(entry) ? mapEchoToPlainJsObject(entry) : { ...entry }));
};

/**
 * Whether a data service call carries a write. `DataService.flush` and a subscription update with nothing to add or remove
 * carry none, so a flush through a lost connection can only fail for the writes it drops.
 */
const carriesWrite = (key: string | symbol, request: unknown): boolean => {
  switch (key) {
    case 'DataService.createDocument':
    case 'DataService.update':
      return true;
    case 'DataService.updateSubscription':
      return (['addIds', 'removeIds'] as const).some(
        (field) => Predicate.hasProperty(request, field) && Array.isArray(request[field]) && request[field].length > 0,
      );
    default:
      return false;
  }
};

/**
 * Connects the peer's client through a connection whose calls carrying writes fail once `disconnect` is called. A call in flight
 * when it drops still reaches the host but loses its response. `reconnect` replaces it the way a dedicated worker leader
 * change does.
 */
const connectServices = async (peer: EchoTestPeer) => {
  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const connect = async (dataHandlers: DataService.Handlers) => {
    const [dataService, queryService] = await EffectEx.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, dataHandlers),
        makeInProcessClient(QueryService.Rpcs, peer.host.queryService),
      ]).pipe(Effect.provideService(Scope.Scope, scope)),
    );
    peer.client._updateServices({ dataService, queryService });
  };
  let connected = true;
  const whileConnected = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.suspend((): Effect.Effect<A, E | RpcClosedError> =>
      connected ? effect : Effect.fail(new RpcClosedError()),
    );
  await connect(
    new Proxy(peer.host.dataService, {
      get: (target, key) => {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') {
          return value;
        }
        const call = value.bind(target);
        return (...args: unknown[]) =>
          carriesWrite(key, args[0])
            ? whileConnected(call(...args)).pipe(
                Effect.tap(() => Effect.promise(() => sleep(0)).pipe(Effect.andThen(whileConnected(Effect.void)))),
              )
            : call(...args);
      },
    }),
  );
  return {
    disconnect: () => {
      connected = false;
    },
    reconnect: async () => {
      await connect(peer.host.dataService);
      await peer.client._notifyReconnect();
    },
  };
};
