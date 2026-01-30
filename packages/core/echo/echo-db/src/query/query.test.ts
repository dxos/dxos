//
// Copyright 2022 DXOS.org
//

import * as A from '@automerge/automerge';
import { type AutomergeUrl } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { type Entity, type Hypergraph, Obj, Order, Ref, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { DXN, PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

import { getObjectCore } from '../echo-handler';
import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '../testing';

import { Filter, Query } from './api';

faker.seed(1);

const tags = ['red', 'green', 'blue'];

Obj.make(Type.Expando, { foo: 100 });

type ObjectProps = {
  [Obj.Meta]?: { tags?: string[] };
  value?: number;
};

const createTestObject = (props: ObjectProps = {}) => {
  return Obj.make(Type.Expando, {
    title: faker.commerce.productName(),
    ...props,
  });
};

const createTestObjects = () => {
  return new Array<Entity.Any>()
    .concat(range(1).map(() => createTestObject()))
    .concat(
      range(3).map(() =>
        createTestObject({
          value: 100,
        }),
      ),
    )
    .concat(
      range(2).map((i) =>
        createTestObject({
          value: 200,
          [Obj.Meta]: { tags: tags.slice(i) },
        }),
      ),
    )
    .concat(
      range(4).map((i) =>
        createTestObject({
          value: 300,
          [Obj.Meta]: { tags: tags.slice(i + 1) },
        }),
      ),
    );
};

describe('Query', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('Query with different filters', () => {
    let db: EchoDatabase;

    beforeEach(async () => {
      ({ db } = await builder.createDatabase());
      createTestObjects().forEach((object) => db.add(object));
      await db.flush({ indexes: true });
    });

    test('query nothing', async () => {
      const objects = await db.query(Query.select(Filter.nothing())).run();
      expect(objects).to.have.length(0);
    });

    test('query everything', async () => {
      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(10);
    });

    test('order by natural', async () => {
      const objects = await db.query(Query.select(Filter.everything())).run();
      const sortedObjects = objects.sort((a, b) => a.id.localeCompare(b.id));
      expect(objects.map((obj) => obj.id)).to.deep.equal(sortedObjects.map((obj) => obj.id));
    });

    test('order by property', async () => {
      const objects = await db.query(Query.select(Filter.everything()).orderBy(Order.property('label', 'asc'))).run();
      const sortedObjects = objects.sort((a, b) => a.label?.localeCompare(b.label));
      expect(objects.map((obj) => obj.label)).to.deep.equal(sortedObjects.map((obj) => obj.label));
    });

    test('order by property descending', async () => {
      const objects = await db.query(Query.select(Filter.everything()).orderBy(Order.property('label', 'desc'))).run();
      const sortedObjects = objects.sort((a, b) => b.label?.localeCompare(a.label));
      expect(objects.map((obj) => obj.label)).to.deep.equal(sortedObjects.map((obj) => obj.label));
    });

    test('limit results', async () => {
      const objects = await db.query(Query.select(Filter.everything()).limit(5)).run();
      expect(objects).to.have.length(5);
    });

    test('limit with ordering', async () => {
      const allObjects = await db.query(Query.select(Filter.everything()).orderBy(Order.natural)).run();
      const limitedObjects = await db.query(Query.select(Filter.everything()).orderBy(Order.natural).limit(3)).run();

      expect(limitedObjects).to.have.length(3);
      // Verify the results are ordered consistently.
      const limitedIds = limitedObjects.map((obj) => obj.id);
      const sortedLimitedIds = [...limitedIds].sort();
      expect(limitedIds).to.deep.equal(sortedLimitedIds);
      // Verify the limited results are a subset of all results.
      const allIds = new Set(allObjects.map((obj) => obj.id));
      for (const id of limitedIds) {
        expect(allIds.has(id)).to.be.true;
      }
    });

    test('limit larger than result set returns all results', async () => {
      const objects = await db.query(Query.select(Filter.everything()).limit(100)).run();
      expect(objects).to.have.length(10);
    });

    test('filter by type', async () => {
      {
        const objects = await db.query(Query.select(Filter.type(Type.Expando, { value: undefined }))).run();
        expect(objects).to.have.length(1);
      }

      {
        const objects = await db.query(Query.select(Filter.type(Type.Expando, { value: 100 }))).run();
        expect(objects).to.have.length(3);
      }

      {
        const objects = await db.query(Query.select(Filter.type(Type.Expando, { value: 400 }))).run();
        expect(objects).to.have.length(0);
      }
    });

    test('filter by tag', async () => {
      {
        const objects = await db.query(Query.select(Filter.tag(tags[1]))).run();
        expect(objects).to.have.length(3);
      }

      {
        const objects = await db.query(Query.select(Filter.tag('bananas'))).run();
        expect(objects).to.have.length(0);
      }
    });

    test('filter expando', async () => {
      const objects = await db.query(Query.select(Filter.type(Type.Expando, { value: 100 }))).run();
      expect(objects).to.have.length(3);
    });

    test('filter by reference', async () => {
      const objA = db.add(Obj.make(Type.Expando, { value: 100 }));
      const objB = db.add(Obj.make(Type.Expando, { value: 200, ref: Ref.make(objA) }));
      await db.flush({ indexes: true });

      const objects = await db.query(Filter.type(Type.Expando, { ref: Ref.make(objA) })).run();
      expect(objects).toEqual([objB]);
    });

    test('filter by foreign keys', async () => {
      const obj = Obj.make(Type.Expando, { value: 100 });
      Obj.getMeta(obj).keys.push({ id: 'test-id', source: 'test-source' });
      db.add(obj);

      await db.flush({ indexes: true });
      const objects = await db
        .query(Filter.foreignKeys(Type.Expando, [{ id: 'test-id', source: 'test-source' }]))
        .run();
      expect(objects).toEqual([obj]);
    });

    test('filter by foreign keys without flushing index', async () => {
      const obj = Obj.make(Type.Expando, { value: 100 });
      Obj.getMeta(obj).keys.push({ id: 'test-id', source: 'test-source' });
      db.add(obj);

      const objects = await db
        .query(Filter.foreignKeys(Type.Expando, [{ id: 'test-id', source: 'test-source' }]))
        .run();
      expect(objects).toEqual([obj]);
    });

    test('filter nothing', async () => {
      const objects = await db.query(Filter.nothing()).run();
      expect(objects).toHaveLength(0);
    });

    test('options', async () => {
      {
        const objects = await db.query(Query.select(Filter.type(Type.Expando, { value: 100 }))).run();
        expect(objects).to.have.length(3);
        for (const object of objects) {
          db.remove(object);
        }
        await db.flush();
      }

      {
        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(7);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()), { deleted: 'exclude' }).run();
        expect(objects).to.have.length(7);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()), { deleted: 'include' }).run();
        expect(objects).to.have.length(10);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()), { deleted: 'only' }).run();
        expect(objects).to.have.length(3);
      }
    });
  });

  describe('Queue queries', () => {
    test('typeDXN: versionless matches any version', async () => {
      const ContactV1 = Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Person', version: '0.1.0' }));

      const ContactV2 = Schema.Struct({
        name: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Person', version: '0.2.0' }));

      const peer = await builder.createPeer({ indexing: { sqlIndex: true }, types: [ContactV1, ContactV2] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();

      const contactV1 = Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' });
      const contactV2 = Obj.make(ContactV2, { name: 'Brian Smith' });
      await queue.append([contactV1, contactV2]);

      const both = await queue.query(Query.select(Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person')))).run();
      expect(both).toHaveLength(2);

      const v1 = await queue
        .query(Query.select(Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person:0.1.0'))))
        .run();
      expect(v1).toEqual([contactV1]);

      const v2 = await queue
        .query(Query.select(Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person:0.2.0'))))
        .run();
      expect(v2).toEqual([contactV2]);
    });

    test('sqlIndex: type selector loads queue-backed objects', async () => {
      const peer = await builder.createPeer({ indexing: { sqlIndex: true }, types: [TestSchema.Task] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();

      const task = Obj.make(TestSchema.Task, { title: 'Queue type selector task' });
      await queue.append([task]);

      await db.flush({ indexes: true });

      const obj: TestSchema.Task = await db
        .query(
          Query.select(Filter.type(TestSchema.Task, { title: 'Queue type selector task' })).options({
            queues: [queue.dxn.toString()],
          }),
        )
        .first();

      expect(obj).toBeDefined();
      expect(obj.id).toEqual(task.id);
      expect(obj.title).toEqual('Queue type selector task');
      expect(Obj.getDXN(obj)?.toString().startsWith(queue.dxn.toString())).toBe(true);
    });

    test('sqlIndex: referencedBy property path matches full path (not just first segment)', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true }, types: [TestSchema.Person] });

      const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));

      db.add(
        Obj.make(Type.Expando, {
          name: 'direct',
          a: Ref.make(person),
        }),
      );

      db.add(
        Obj.make(Type.Expando, {
          name: 'nested',
          a: { b: Ref.make(person) },
        }),
      );

      await db.flush({ indexes: true });

      // When no property is specified, referencedBy() should return all incoming references (including nested ones).
      const allIncoming = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(Type.Expando))
        .run();
      expect(allIncoming.map((o) => o.name).sort()).toEqual(['direct', 'nested']);

      const nested = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(Type.Expando, 'a.b'))
        .run();
      expect(nested.map((o) => o.name).sort()).toEqual(['nested']);

      const direct = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(Type.Expando, 'a'))
        .run();
      expect(direct.map((o) => o.name).sort()).toEqual(['direct']);
    });
  });

  test('query.run() queries everything after restart', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    let root: AutomergeUrl;
    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await peer.createDatabase(spaceKey);
      await createObjects(peer, db, { count: 3 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(3);
      root = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle().url!;
      await peer.close();
    }

    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await peer.openDatabase(spaceKey, root);
      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(3);
    }
  });

  test('objects with incorrect document urls are ignored', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    let root: AutomergeUrl;
    let expectedObjectId: string;
    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await peer.createDatabase(spaceKey);
      const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(2);
      const rootDocHandle = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle();
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = 'automerge:4hjTgo9zLNsfRTJiLcpPY8P4smy';
      });
      await db.flush();
      root = rootDocHandle.url!;
      expectedObjectId = obj2.id;
      await peer.close();
    }

    {
      const peer = await builder.createPeer({ kv: createTestLevel(tmpPath) });
      const db = await peer.openDatabase(spaceKey, root);
      const queryResult = await db.query(Query.select(Filter.everything())).run();
      expect(queryResult.length).to.eq(1);
      expect(queryResult[0].id).to.eq(expectedObjectId);
    }
  });

  test('objects url changes, the latest document is loaded', async () => {
    const spaceKey = PublicKey.random();
    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer();

    let root: AutomergeUrl;
    let assertion: { objectId: string; documentUrl: string };
    {
      const db = await peer.createDatabase(spaceKey);
      const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(2);
      const rootDocHandle = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle();
      const obj1DocHandle = getObjectCore(obj1).docHandle!;
      const anotherDocHandle = getObjectCore(obj2).docHandle!;
      // Wait for documents to be ready before accessing url and objects.
      await Promise.all([rootDocHandle.whenReady(), obj1DocHandle.whenReady(), anotherDocHandle.whenReady()]);
      anotherDocHandle.change((doc: DatabaseDirectory) => {
        doc.objects![obj1.id] = obj1DocHandle.doc()!.objects![obj1.id];
      });
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = new A.RawString(anotherDocHandle.url!);
      });
      await db.flush();
      await peer.host.queryService.reindex();

      root = rootDocHandle.url!;
      assertion = { objectId: obj2.id, documentUrl: anotherDocHandle.url! };
    }

    await peer.reload();

    {
      const db = await peer.openDatabase(spaceKey, root);
      await db.coreDatabase.updateIndexes();
      const queryResult = await db.query(Query.select(Filter.everything())).run();
      expect(queryResult.length).to.eq(2);

      const object = queryResult.find((obj) => obj.id === assertion.objectId)!;
      expect(getObjectCore(object).docHandle!.url).to.eq(assertion.documentUrl);
      expect(queryResult.find((obj) => obj.id !== assertion.objectId)).not.to.be.undefined;
    }
  });

  test('query immediately after delete works', async () => {
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer({ kv });
    const db = await peer.createDatabase(spaceKey);
    const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

    db.remove(obj2);

    const queryResult = await db.query(Query.select(Filter.everything())).run();
    expect(queryResult.length).to.eq(1);
    expect(queryResult[0].id).to.eq(obj1.id);
  });

  test('query fails if one of the results fails to load', async () => {
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer();
    const db = await peer.createDatabase(spaceKey);
    const [obj1] = await createObjects(peer, db, { count: 2 });

    const obj2Core = getObjectCore(obj1);
    obj2Core.docHandle!.delete(); // Deleted handle access throws an exception.

    await expect(db.query(Query.select(Filter.everything())).run()).rejects.toBeInstanceOf(Error);
  });

  // TODO(burdon): Flakey.
  test.skip('map over refs in query result', async () => {
    const { db } = await builder.createDatabase();
    const folder = db.add(Obj.make(Type.Expando, { name: 'folder', objects: [] as any[] }));
    const objects = range(3).map(() => createTestObject());
    for (const object of objects) {
      folder.objects.push(Ref.make(object as any));
    }

    const queryResult = await db.query(Filter.type(Type.Expando, { name: 'folder' })).run();
    const result = queryResult.flatMap(({ objects }) => objects.map((o: Ref.Any) => o.target));

    for (const i in objects) {
      expect(result[i]).to.eq(objects[i]);
    }
  });

  describe('Filter', () => {
    test('query objects with different versions', async () => {
      const ContactV1 = Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Person', version: '0.1.0' }));

      const ContactV2 = Schema.Struct({
        name: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Person', version: '0.2.0' }));

      const { peer, db } = await builder.createDatabase({
        types: [ContactV1, ContactV2],
      });

      const contactV1 = db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
      const contactV2 = db.add(Obj.make(ContactV2, { name: 'Brian Smith' }));
      await db.flush({ indexes: true });

      const assertQueries = async (db: EchoDatabase) => {
        await assertQuery(db, Filter.type(ContactV1), [contactV1]);
        await assertQuery(db, Filter.type(ContactV1), [contactV1]);
        await assertQuery(db, Filter.type(ContactV2), [contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person')), [contactV1, contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person:0.1.0')), [contactV1]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person:0.2.0')), [contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Person:0.2.0')), [contactV2]);
      };

      await assertQueries(db);

      await peer.reload();
      await assertQueries(await peer.openLastDatabase());
    });

    test('not(or) query', async () => {
      const { db, graph } = await builder.createDatabase();
      await graph.schemaRegistry.register([TestSchema.Person, TestSchema.Task]);

      db.add(Obj.make(TestSchema.Person, {}));
      db.add(Obj.make(TestSchema.Task, {}));
      const expando = db.add(Obj.make(Type.Expando, { name: 'expando' }));

      const query = db.query(
        Query.select(Filter.not(Filter.or(Filter.type(TestSchema.Person), Filter.type(TestSchema.Task)))),
      );
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(expando);
    });

    test('filter by refs', async () => {
      const { db } = await builder.createDatabase();

      const a = db.add(Obj.make(Type.Expando, { name: 'a' }));
      const b = db.add(Obj.make(Type.Expando, { name: 'b', owner: Ref.make(a) }));
      db.add(Obj.make(Type.Expando, { name: 'c' }));

      const objects = await db.query(Query.select(Filter.type(Type.Expando, { owner: Ref.make(a) }))).run();
      expect(objects).toEqual([b]);
    });

    test('query relation by type', async () => {
      const { db, graph } = await builder.createDatabase();
      await graph.schemaRegistry.register([TestSchema.Person, TestSchema.HasManager]);

      const person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const hasManager = db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: person1,
          [Relation.Target]: person2,
        }),
      );

      const objects = await db.query(Filter.type(TestSchema.HasManager)).run();
      expect(objects).toEqual([hasManager]);
    });

    test('tags', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(Type.Expando, { name: 'a' }));
      const b = db.add(
        Obj.make(Type.Expando, {
          name: 'b',
          [Obj.Meta]: { tags: ['important'] },
        }),
      );
      const c = db.add(
        Obj.make(Type.Expando, {
          name: 'c',
          [Obj.Meta]: { tags: ['important', 'investor'] },
        }),
      );

      const objects = await db.query(Query.select(Filter.tag('important'))).run();
      expect(objects).toEqual([b, c]);
    });
  });

  describe('Traversal', () => {
    let db: EchoDatabase;
    let person1: TestSchema.Person;
    let person2: TestSchema.Person;

    beforeEach(async () => {
      ({ db } = await builder.createDatabase({
        types: [TestSchema.Person, TestSchema.HasManager, TestSchema.Task],
      }));

      person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: person2,
          [Relation.Target]: person1,
        }),
      );

      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 1',
          assignee: Ref.make(person1),
        }),
      );
      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 2',
          assignee: Ref.make(person1),
        }),
      );
      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 3',
          assignee: Ref.make(person2),
        }),
      );

      await db.flush({ indexes: true });
    });

    test('traverse relation source to target', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Bob' }))
            .sourceOf(TestSchema.HasManager)
            .target(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse relation target to source', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Alice' }))
            .targetOf(TestSchema.HasManager)
            .source(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Bob' }]);
    });

    test('traverse outbound references', async () => {
      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Task, { title: 'Task 1' })).reference('assignee'))
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
      log.info('done testing');
    });

    test('traverse outbound array references', async () => {
      db.add(
        Obj.make(Type.Expando, {
          name: 'Contacts',
          objects: [Ref.make(person1)],
        }),
      );
      await db.flush({ indexes: true });

      const objects = await db
        .query(Query.select(Filter.type(Type.Expando, { name: 'Contacts' })).reference('objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse inbound references', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Task, 'assignee'),
        )
        .run();

      // TODO(dmaretskyi): Sort in query result.
      expect(objects.sort((a, b) => a.title!.localeCompare(b.title!))).toMatchObject([
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
    });

    test('traverse inbound array references', async () => {
      db.add(
        Obj.make(Type.Expando, {
          name: 'Contacts',
          objects: [Ref.make(person1)],
        }),
      );
      await db.flush({ indexes: true });

      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person)).referencedBy(Type.Expando, 'objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Contacts' }]);
    });

    test('traverse inbound references with only type filter (any property)', async () => {
      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Task))
        .run();

      // Should return Task 1 and Task 2 which reference Alice via assignee property.
      expect(objects.sort((a, b) => a.title!.localeCompare(b.title!))).toMatchObject([
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
    });

    test('traverse inbound references with no filter (any type, any property)', async () => {
      // Add an expando that references person1.
      db.add(
        Obj.make(Type.Expando, {
          name: 'Note about Alice',
          subject: Ref.make(person1),
        }),
      );
      await db.flush({ indexes: true });

      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy())
        .run();

      // Should return all objects that reference Alice via regular references: Task 1, Task 2, and the Note.
      // Note: Relations (like HasManager) are not included because they use a different storage mechanism.
      expect(objects).toHaveLength(3);
      const titles = objects
        .filter((o) => o.title)
        .map((o) => o.title)
        .sort();
      expect(titles).toEqual(['Task 1', 'Task 2']);
      const names = objects
        .filter((o) => o.name)
        .map((o) => o.name)
        .sort();
      expect(names).toEqual(['Note about Alice']);
    });

    test('traverse query started from id', async () => {
      const objects = await db
        .query(Query.select(Filter.id(person2.id)).sourceOf(TestSchema.HasManager).target())
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('query union', async () => {
      const query1 = Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(
        TestSchema.Task,
        'assignee',
      );
      const query2 = Query.select(Filter.type(TestSchema.Person, { name: 'Bob' })).referencedBy(
        TestSchema.Task,
        'assignee',
      );
      const query = Query.all(query1, query2);
      const objects = await db.query(query).run();
      expect(objects).toHaveLength(3);
    });

    test('union of limited queries', async () => {
      // Query for tasks assigned to Alice, limited to 1.
      const query1 = Query.select(Filter.type(TestSchema.Person, { name: 'Alice' }))
        .referencedBy(TestSchema.Task, 'assignee')
        .limit(1);
      // Query for tasks assigned to Bob, limited to 1.
      const query2 = Query.select(Filter.type(TestSchema.Person, { name: 'Bob' }))
        .referencedBy(TestSchema.Task, 'assignee')
        .limit(1);

      const query = Query.all(query1, query2);
      const objects = await db.query(query).run();

      // Should get 1 task from Alice (out of 2) + 1 task from Bob (out of 1) = 2 total.
      expect(objects).toHaveLength(2);
    });

    test('query set difference', async () => {
      const query1 = Query.select(Filter.type(TestSchema.Person));
      const query2 = Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.HasManager).source();
      const query = Query.without(query1, query2);
      const objects = await db.query(query).run();
      expect(objects).toEqual([person1]);
    });
  });

  describe.skip('text search (old indexer)', () => {
    test('vector', async () => {
      const { db } = await builder.createDatabase({
        indexing: { vector: true },
        types: [TestSchema.Task],
      });

      db.add(Obj.make(TestSchema.Task, { title: 'fix the tests' }));
      db.add(Obj.make(TestSchema.Task, { title: 'perf optimizations' }));
      await db.flush({ indexes: true });

      {
        const objects = await db.query(Query.select(Filter.text('fix the tests', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('fix the tests');
      }

      {
        const objects = await db.query(Query.select(Filter.text('perf optimizations', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('perf optimizations');
      }

      {
        const objects = await db.query(Query.select(Filter.text('vegetable', { type: 'vector' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('fix the tests');
      }
    });

    test('full-text', async () => {
      const { db, graph } = await builder.createDatabase({
        indexing: { sqlIndex: true },
      });
      await graph.schemaRegistry.register([TestSchema.Task]);

      db.add(Obj.make(TestSchema.Task, { title: 'fix the tests' }));
      db.add(Obj.make(TestSchema.Task, { title: 'perf optimizations' }));

      await db.flush({ indexes: true });

      {
        const objects = await db.query(Query.select(Filter.text('fix the tests', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('fix the tests');
      }

      {
        const objects = await db.query(Query.select(Filter.text('perf optimizations', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('perf optimizations');
      }

      {
        const objects = await db.query(Query.select(Filter.text('vegetable', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }

      {
        const objects = await db.query(Query.select(Filter.text('animal', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });
  });

  describe('indexer2 text search', () => {
    test('full-text search via indexer2', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      db.add(Obj.make(Type.Expando, { title: 'Introduction to TypeScript' }));
      db.add(Obj.make(Type.Expando, { title: 'Getting Started with React' }));
      db.add(Obj.make(Type.Expando, { title: 'Advanced Python Programming' }));
      await db.flush({ indexes: true });

      // TODO(mykola): Defalut to full-text
      const objects = await db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' }))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0].title).toEqual('Introduction to TypeScript');

      // Verify specific search results.
      {
        const objects = await db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Introduction to TypeScript');
      }

      {
        const objects = await db.query(Query.select(Filter.text('React', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Getting Started with React');
      }

      {
        const objects = await db.query(Query.select(Filter.text('Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Non-matching query.
      {
        const objects = await db.query(Query.select(Filter.text('JavaScript', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });

    test('full-text search across multiple matching objects', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      db.add(Obj.make(Type.Expando, { title: 'Programming with JavaScript' }));
      db.add(Obj.make(Type.Expando, { title: 'JavaScript Best Practices' }));
      db.add(Obj.make(Type.Expando, { title: 'Python for Data Science' }));
      await db.flush({ indexes: true });

      const objects = await db.query(Query.select(Filter.text('JavaScript', { type: 'full-text' }))).run();
      expect(objects).toHaveLength(2);
      expect(objects.map((o) => o.title).sort()).toEqual(
        ['JavaScript Best Practices', 'Programming with JavaScript'].sort(),
      );
    });

    test('full-text search with partial word matching (trigram)', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      db.add(Obj.make(Type.Expando, { title: 'Introduction to TypeScript' }));
      db.add(Obj.make(Type.Expando, { title: 'Getting Started with React' }));
      db.add(Obj.make(Type.Expando, { title: 'Advanced Python Programming' }));
      await db.flush({ indexes: true });

      // Partial word "Script" should match "TypeScript".
      {
        const objects = await db.query(Query.select(Filter.text('Script', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Introduction to TypeScript');
      }

      // Partial word "Prog" should match "Programming".
      {
        const objects = await db.query(Query.select(Filter.text('Prog', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Substring in the middle "Pytho" should match "Python".
      {
        const objects = await db.query(Query.select(Filter.text('ytho', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Single character query uses LIKE fallback and matches all documents
      {
        const objects = await db.query(Query.select(Filter.text('I', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(3);
      }
    });

    test('full-text search with wrong word order', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      db.add(Obj.make(Type.Expando, { title: 'Python Programming Guide' }));
      db.add(Obj.make(Type.Expando, { title: 'JavaScript Basics' }));
      await db.flush({ indexes: true });

      // Words in different order should still match.
      {
        const objects = await db.query(Query.select(Filter.text('Programming Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Python Programming Guide');
      }

      // Another wrong order example.
      {
        const objects = await db.query(Query.select(Filter.text('Guide Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Python Programming Guide');
      }
    });

    test('full-text search after content update', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      const obj = db.add(Obj.make(Type.Expando, { title: 'Original Title' }));
      await db.flush({ indexes: true });

      // Poll until indexer2 has processed the document.
      {
        const objects = await db.query(Query.select(Filter.text('Original', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
      }

      // Update the object.
      Obj.change(obj, (o) => {
        o.title = 'Updated Title';
      });
      await db.flush({ indexes: true });

      // Verify search results.
      {
        const objects = await db.query(Query.select(Filter.text('Updated', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Updated Title');
      }

      // Original content should no longer match.
      {
        const objects = await db.query(Query.select(Filter.text('Original', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });

    test.skip('stress', { timeout: 1200_000 }, async () => {
      console.log('begin test');
      const { db } = await builder.createDatabase();

      const ANIMALS = [
        'dog',
        'cat',
        'bird',
        'fish',
        'horse',
        'rabbit',
        'snake',
        'tiger',
        'lion',
        'elephant',
        'zebra',
        'giraffe',
        'monkey',
        'penguin',
        'koala',
        'kangaroo',
        'panda',
      ];

      console.log('begin create');

      console.time('create');
      const counts = Object.fromEntries(ANIMALS.map((animal) => [animal, 0]));
      for (const _ of range(10_000)) {
        const animal = faker.helpers.arrayElement(ANIMALS);
        counts[animal]++;
        db.add(
          Obj.make(Type.Expando, { title: faker.lorem.sentence(10) + ' ' + animal + ' ' + faker.lorem.sentence(10) }),
        );
        if (_ % 1000 === 0) {
          await sleep(1);
          console.log('creating', _);
        }
      }
      console.timeEnd('create');

      console.time('flush');
      await db.flush({ indexes: true });
      console.timeEnd('flush');

      console.time('query');
      const needle = faker.helpers.arrayElement(ANIMALS);
      const objects = await db.query(Query.select(Filter.text(needle, { type: 'full-text' }))).run();
      console.timeEnd('query');
      console.log('objects', {
        needle,
        count: objects.length,
        expected: counts[needle],
      });
      for (const object of objects) {
        expect(object.title).toContain(needle);
      }
    });

    test('full-text search in queues via indexer2', async () => {
      const peer = await builder.createPeer({ indexing: { sqlIndex: true }, types: [TestSchema.Task] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();

      // Add objects to the queue.
      await queue.append([
        Obj.make(TestSchema.Task, { title: 'Introduction to TypeScript' }),
        Obj.make(TestSchema.Task, { title: 'Getting Started with React' }),
        Obj.make(TestSchema.Task, { title: 'Advanced Python Programming' }),
      ]);

      // Wait for indexing.
      await db.flush({ indexes: true });

      // Search in specific queue.
      {
        const objects = await db
          .query(
            Query.select(Filter.text('TypeScript', { type: 'full-text' })).options({ queues: [queue.dxn.toString()] }),
          )
          .run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Introduction to TypeScript');
      }

      // Search for React.
      {
        const objects = await db
          .query(Query.select(Filter.text('React', { type: 'full-text' })).options({ queues: [queue.dxn.toString()] }))
          .run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Getting Started with React');
      }

      // Non-matching query.
      {
        const objects = await db
          .query(
            Query.select(Filter.text('JavaScript', { type: 'full-text' })).options({ queues: [queue.dxn.toString()] }),
          )
          .run();
        expect(objects).toHaveLength(0);
      }
    });

    test('full-text search with allQueuesFromSpaces via indexer2', async () => {
      const peer = await builder.createPeer({ indexing: { sqlIndex: true }, types: [TestSchema.Task] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();

      // Add objects to the database (space objects).
      db.add(Obj.make(TestSchema.Task, { title: 'Space Object TypeScript' }));

      // Add objects to the queue.
      await queue.append([Obj.make(TestSchema.Task, { title: 'Queue Object TypeScript' })]);

      // Wait for indexing.
      await db.flush({ indexes: true });

      // Search with allQueuesFromSpaces: true should return both space and queue objects.
      {
        const objects: TestSchema.Task[] = await db
          .query(
            Query.select(Filter.text('TypeScript', { type: 'full-text' })).options({
              allQueuesFromSpaces: true,
            }),
          )
          .run();
        expect(objects).toHaveLength(2);
        expect(objects.map((_) => _.title).sort()).toEqual(['Queue Object TypeScript', 'Space Object TypeScript']);
      }

      // Search without allQueuesFromSpaces should return only space objects.
      {
        const objects = await db
          .query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).options({}))
          .run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Space Object TypeScript');
      }

      // console.log('dumpSqliteDatabase', await peer.dumpSqliteDatabase());
    });

    test('full-text search from queue returns valid echo objects', async () => {
      const peer = await builder.createPeer({ indexing: { sqlIndex: true }, types: [TestSchema.Task] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      const task = Obj.make(TestSchema.Task, { title: 'Queue Object TypeScript' });
      await queue.append([task]);
      await db.flush({ indexes: true });

      const obj: TestSchema.Task = await db
        .query(
          Query.select(Filter.text('TypeScript', { type: 'full-text' })).options({ queues: [queue.dxn.toString()] }),
        )
        .first();
      expect(obj).toBeDefined();
      expect(Obj.getDXN(obj)?.toString().startsWith(queue.dxn.toString())).toBe(true);
      expect(Obj.getTypename(obj)).toBe(TestSchema.Task.typename);
      expect(Obj.getSchema(obj)).toEqual(TestSchema.Task);
      expect(obj.id).toEqual(task.id);
      expect(Obj.isDeleted(obj)).toBe(false);
      expect(Obj.getMeta(obj).keys).toEqual([]);
      expect(obj.title).toEqual('Queue Object TypeScript');
    });

    test('full-text search returns rank in entries', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript Programming' })); // Medium relevance.
      db.add(Obj.make(Type.Expando, { title: 'Python Programming' })); // No match.
      await db.flush({ indexes: true });

      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(2);
      // All FTS results should have a rank in their match metadata.
      for (const entry of entries) {
        expect(entry.match).toBeDefined();
        expect(entry.match!.rank).toBeDefined();
        expect(typeof entry.match!.rank).toBe('number');
        expect(entry.match!.rank).toBeGreaterThan(0);
      }
    });

    test('full-text search order by rank descending (default)', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      // Create objects with varying relevance to the search term "TypeScript".
      db.add(Obj.make(Type.Expando, { title: 'TypeScript' })); // Single occurrence.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript Programming Guide' })); // Medium relevance.
      await db.flush({ indexes: true });

      // Order by rank descending (best matches first) - default direction.
      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).orderBy(Order.rank()));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(3);

      // Verify ranks are in descending order (higher rank = better match = first).
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].match!.rank).toBeGreaterThanOrEqual(entries[i + 1].match!.rank);
      }

      // The item with highest relevance (most occurrences) should be first.
      expect(entries[0].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
    });

    test('full-text search order by rank ascending', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      // Create objects with varying relevance to the search term "TypeScript".
      db.add(Obj.make(Type.Expando, { title: 'TypeScript' })); // Single occurrence.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript Programming Guide' })); // Medium relevance.
      await db.flush({ indexes: true });

      // Order by rank ascending (worst matches first).
      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).orderBy(Order.rank('asc')));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(3);

      // Verify ranks are in ascending order (lower rank = worse match = first).
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].match!.rank).toBeLessThanOrEqual(entries[i + 1].match!.rank);
      }

      // The item with lowest relevance should be first.
      expect(entries[entries.length - 1].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
    });

    test('non-FTS queries return default rank of 1', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(Type.Expando, { title: 'Non-FTS Test Object 1' }));
      db.add(Obj.make(Type.Expando, { title: 'Non-FTS Test Object 2' }));
      await db.flush({ indexes: true });

      // Non-FTS query (all expandos, no text search).
      const query = db.query(Query.select(Filter.type(Type.Expando)));
      const entries = await query.runEntries();

      // Should have at least 2 entries (the ones we created).
      expect(entries.length).toBeGreaterThanOrEqual(2);
      // All non-FTS results should have a default rank of 1.
      for (const entry of entries) {
        expect(entry.match).toBeDefined();
        expect(entry.match!.rank).toBe(1);
      }
    });

    test('order by rank with limit', async () => {
      const { db } = await builder.createDatabase({ indexing: { sqlIndex: true } });

      // Create multiple objects with varying relevance.
      db.add(Obj.make(Type.Expando, { title: 'TypeScript' }));
      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript' }));
      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript TypeScript' }));
      db.add(Obj.make(Type.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' }));
      await db.flush({ indexes: true });

      // Order by rank descending and limit to top 2 results.
      const query = db.query(
        Query.select(Filter.text('TypeScript', { type: 'full-text' }))
          .orderBy(Order.rank())
          .limit(2),
      );
      const entries = await query.runEntries();

      expect(entries).toHaveLength(2);
      // Should get the top 2 most relevant results.
      expect(entries[0].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
      expect(entries[1].result!.title).toBe('TypeScript TypeScript TypeScript');
    });
  });

  describe('Reactivity', () => {
    let db: EchoDatabase;
    let objects: Obj.Any[];

    beforeEach(async () => {
      ({ db } = await builder.createDatabase());

      objects = range(3).map(() => createTestObject({ value: 100 }));
      for (const object of objects) {
        db.add(object);
      }

      await db.flush({ indexes: true });
    });

    test('fires only once when new objects are added', async () => {
      const query = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      let lastResult;
      query.subscribe(() => {
        count++;
        lastResult = query.results;
      });
      expect(count).to.equal(0);

      db.add(createTestObject({ value: 100 }));
      await db.flush({ updates: true, indexes: true });
      expect(count).to.equal(1);
      expect(lastResult).to.have.length(4);
    });

    test('fires only once when objects are removed', async () => {
      const query = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      query.subscribe(() => {
        console.log('query.results', query.results);
        count++;
        expect(query.results).to.have.length(2);
      });
      db.remove(objects[0]);
      await db.flush({ updates: true, indexes: true });
      expect(count).to.equal(1);
    });

    test('does not fire on object updates', async () => {
      const query = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let updateCount = 0;
      query.subscribe(() => {
        updateCount++;
      });
      Obj.change(objects[0], (o: any) => {
        o.title = 'Task 0a';
      });
      await sleep(10);
      expect(updateCount).to.equal(0);
    });

    test('can unsubscribe and resubscribe', async () => {
      const query = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));

      let count = 0;
      let lastCount = 0;
      let lastResult;
      const unsubscribe = query.subscribe(() => {
        count++;
        lastResult = query.results;
      });
      expect(count, 'Does not fire updates immediately.').to.equal(0);

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(4);
      }

      unsubscribe();

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.equal(lastCount);
        lastCount = count;
      }

      query.subscribe(() => {
        count++;
        lastResult = query.results;
      });

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(6);
      }
    });

    test('multiple queries do not influence each other', async () => {
      const query1 = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));
      const query2 = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));

      let count1 = 0;
      let count2 = 0;
      query1.subscribe(() => {
        count1++;
      });
      query2.subscribe(() => {
        count2++;
      });

      db.add(createTestObject({ value: 100 }));
      await db.flush({ updates: true, indexes: true });

      expect(count1).toEqual(1);
      expect(count2).toEqual(1);
    });

    // TODO(dmaretskyi): Fix this test.
    test.skip('deleting an element', async (ctx) => {
      const { db } = await builder.createDatabase({
        types: [TestSchema.Person],
      });

      // Create 3 test objects: Alice, Bob, Charlie.
      const person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const person3 = db.add(Obj.make(TestSchema.Person, { name: 'Charlie' }));
      expect([person1, person2, person3].filter(Boolean)).to.have.length(3);
      await db.flush({ indexes: true });

      // Track all updates to observe the bug.
      log.break();
      const updates: string[][] = [];
      const unsub = db.query(Query.select(Filter.type(TestSchema.Person))).subscribe(
        (query) => {
          const names = query.results.map((obj) => obj.name!);
          log.info('upd', { names });
          updates.push(names);
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await db.flush({ indexes: true, updates: true });
      log.break();

      // THE BUG REPRODUCTION: Delete Bob.
      db.remove(person2);
      log.info('removed bob');
      log.break();

      // Wait for all reactive updates to complete.
      await db.flush({ indexes: true, updates: true });
      log.break();

      // TODO(ZaymonFC): Remove this comment once the flash bug is resolved.
      /*
       * NOTE(ZaymonFC):
       *   Expected: 3 renders
       *   1. [] (empty)
       *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
       *   3. ['Alice', 'Charlie'] (Bob removed, no flash)
       *
       *   Actual: 4 renders
       *   1. [] (empty)
       *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
       *   3. ['Alice', 'Charlie', 'Bob'] (FLASH BUG - Bob moves to end!)
       *   4. ['Alice', 'Charlie'] (Bob finally removed)
       */

      expect(updates).toEqual([
        ['Alice', 'Bob', 'Charlie'], // All objects loaded.
        ['Alice', 'Charlie'], // Bob removed (no flash).
      ]);
    });

    test('bulk deleting multiple items should remove them from query results', async (ctx) => {
      // Setup: Create client and space.
      const { db } = await builder.createDatabase();

      // Create 10 test objects: 1, 2, 3, ..., 10.
      const objects = Array.from({ length: 10 }, (_, i) => db.add(Obj.make(Type.Expando, { value: i + 1 })));
      await db.flush({ indexes: true, updates: true });

      // Track all updates to observe the bug.
      const updates: number[][] = [];
      const unsub = db.query(Query.select(Filter.type(Type.Expando))).subscribe(
        (query) => {
          const values = [...query.results.map((obj) => obj.value)].sort((a, b) => a - b);
          updates.push(values);
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await db.flush({ indexes: true, updates: true });

      // THE BUG REPRODUCTION: Delete all items in a loop.
      for (const item of objects) {
        db.remove(item);
      }

      // Wait for all reactive updates to complete.
      // TODO(dmaretskyi): Does this ensure queries were re-run?
      await db.flush({ indexes: true, updates: true });

      // NOTE: There might be multiple updates dependending on how database components execute updates.
      // All objects loaded.
      expect(updates.at(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      // All objects deleted.
      expect(updates.at(-1)).toEqual([]);
    });
  });

  describe('Dynamic types', () => {
    let db: EchoDatabase, graph: Hypergraph.Hypergraph;

    beforeEach(async () => {
      ({ db, graph } = await builder.createDatabase());
    });

    test('query by typename receives updates', async () => {
      await graph.schemaRegistry.register([TestSchema.Person]);
      const contact = db.add(Obj.make(TestSchema.Person, {}));
      const name = 'DXOS User';

      const query = db.query(Filter.type(TestSchema.Person));
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(contact);

      const nameUpdate = new Trigger();
      const anotherContactAdded = new Trigger();
      const unsub = query.subscribe((query) => {
        const objects = query.results;
        if (objects.some((obj) => obj.name === name)) {
          nameUpdate.wake();
        }
        if (objects.length === 2) {
          anotherContactAdded.wake();
        }
      });
      onTestFinished(() => unsub());

      Obj.change(contact, (c) => {
        c.name = name;
      });
      db.add(Obj.make(TestSchema.Person, {}));

      await asyncTimeout(nameUpdate.wait(), 1000);
      await asyncTimeout(anotherContactAdded.wait(), 1000);
    });

    test('query mutable schema objects', async () => {
      const [schema] = await db.schemaRegistry.register([TestSchema.Person]);
      const contact = db.add(Obj.make(schema, {}));

      // NOTE: Must use `Filter.type` with EchoSchema instance since matching is done by the object ID of the mutable schema.
      const query = db.query(Query.type(schema));
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(contact);
    });

    test('`instanceof` operator works', async () => {
      await graph.schemaRegistry.register([TestSchema.Person]);
      const name = 'DXOS User';
      const contact = Obj.make(TestSchema.Person, { name });
      db.add(contact);
      expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;

      // query
      {
        const contact = (await db.query(Filter.type(TestSchema.Person)).run())[0];
        expect(contact.name).to.eq(name);
        expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;
      }
    });
  });
});

const createObjects = async (peer: EchoTestPeer, db: EchoDatabase, options: { count: number }) => {
  const objects = range(options.count, () => db.add(createTestObject()));
  await db.flush({ indexes: true });
  return objects;
};

const assertQuery = async (db: EchoDatabase, filter: Filter.Any, expected: any[]) => {
  const objects = await db.query(Query.select(filter)).run();
  expect(sortById(objects)).toEqual(expect.arrayContaining(sortById(expected)));
};

const sortById = (objects: any[]) => objects.sort((a, b) => a.id.localeCompare(b.id));
