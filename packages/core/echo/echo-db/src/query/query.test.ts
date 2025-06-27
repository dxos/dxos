//
// Copyright 2022 DXOS.org
//

import { type AutomergeUrl } from '@automerge/automerge-repo';
import { Schema } from 'effect';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, type TestContext } from 'vitest';

import { asyncTimeout, sleep, Trigger } from '@dxos/async';
import { Obj, Type } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { Expando, RelationSourceId, RelationTargetId, TypedObject, Ref, EchoObject } from '@dxos/echo-schema';
import { Testing, type updateCounter } from '@dxos/echo-schema/testing';
import { DXN, PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { live, getMeta, type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { Filter, Query } from './api';
import { getObjectCore } from '../echo-handler';
import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder, type EchoTestPeer } from '../testing';
import type { Hypergraph } from '../hypergraph';
import { effect } from '@preact/signals-core';

const createTestObject = (idx: number, label?: string) => {
  return live(Expando, { idx, title: `Task ${idx}`, label });
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
      const setup = await builder.createDatabase();
      db = setup.db;

      const objects = [createTestObject(9)]
        .concat(range(3).map((idx) => createTestObject(idx, 'red')))
        .concat(range(2).map((idx) => createTestObject(idx + 3, 'green')))
        .concat(range(4).map((idx) => createTestObject(idx + 5, 'blue')));

      for (const object of objects) {
        db.add(object);
      }

      await db.flush({ indexes: true });
    });

    test('query everything', async () => {
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(10);
    });

    test('filter properties', async () => {
      {
        const { objects } = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(10);
      }

      {
        const { objects } = await db.query(Query.select(Filter.type(Expando, { label: undefined }))).run();
        expect(objects).to.have.length(1);
      }

      {
        const { objects } = await db.query(Query.select(Filter.type(Expando, { label: 'red' }))).run();
        expect(objects).to.have.length(3);
      }

      {
        const { objects } = await db.query(Query.select(Filter.type(Expando, { label: 'pink' }))).run();
        expect(objects).to.have.length(0);
      }
    });

    test('filter expando', async () => {
      const { objects } = await db.query(Query.select(Filter.type(Expando, { label: 'red' }))).run();
      expect(objects).to.have.length(3);
    });

    test('filter by reference', async () => {
      const objA = db.add(live(Expando, { label: 'obj a' }));
      const objB = db.add(live(Expando, { label: 'obj b', ref: Ref.make(objA) }));
      await db.flush({ indexes: true });

      const { objects } = await db.query(Filter.type(Expando, { ref: Ref.make(objA) })).run();
      expect(objects).toEqual([objB]);
    });

    test('filter by foreign keys', async () => {
      const obj = live(Expando, { label: 'has meta' });
      getMeta(obj).keys.push({ id: 'test-id', source: 'test-source' });
      db.add(obj);
      await db.flush({ indexes: true });

      const { objects } = await db.query(Filter.foreignKeys(Expando, [{ id: 'test-id', source: 'test-source' }])).run();
      expect(objects).toEqual([obj]);
    });

    test('filter nothing', async () => {
      const { objects } = await db.query(Filter.nothing()).run();
      expect(objects).toHaveLength(0);
    });

    test('options', async () => {
      {
        const { objects } = await db.query(Query.select(Filter.type(Expando, { label: 'red' }))).run();
        expect(objects).to.have.length(3);
        for (const object of objects) {
          db.remove(object);
        }
        await db.flush();
      }

      {
        const { objects } = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(7);
      }

      {
        const { objects } = await db
          .query(Query.select(Filter.everything()), { deleted: QueryOptions.ShowDeletedOption.HIDE_DELETED })
          .run();
        expect(objects).to.have.length(7);
      }

      {
        const { objects } = await db
          .query(Query.select(Filter.everything()), { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED })
          .run();
        expect(objects).to.have.length(10);
      }

      {
        const { objects } = await db
          .query(Query.select(Filter.everything()), { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED_ONLY })
          .run();
        expect(objects).to.have.length(3);
      }
    });
  });

  test('query.run() queries everything after restart', async () => {
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    let root: AutomergeUrl;
    {
      const peer = await builder.createPeer({ kv });
      const db = await peer.createDatabase(spaceKey);
      await createObjects(peer, db, { count: 3 });

      expect((await db.query(Query.select(Filter.everything())).run()).objects.length).to.eq(3);
      root = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle().url;
    }

    {
      const peer = await builder.createPeer({ kv });
      const db = await peer.openDatabase(spaceKey, root);
      expect((await db.query(Query.select(Filter.everything())).run()).objects.length).to.eq(3);
    }
  });

  test('objects with incorrect document urls are ignored', async () => {
    const kv = createTestLevel();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    let root: AutomergeUrl;
    let expectedObjectId: string;
    {
      const peer = await builder.createPeer({ kv });
      const db = await peer.createDatabase(spaceKey);
      const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

      expect((await db.query(Query.select(Filter.everything())).run()).objects.length).to.eq(2);
      const rootDocHandle = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle();
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = 'automerge:4hjTgo9zLNsfRTJiLcpPY8P4smy';
      });
      await db.flush();
      root = rootDocHandle.url;
      expectedObjectId = obj2.id;
    }

    {
      const peer = await builder.createPeer({ kv });
      const db = await peer.openDatabase(spaceKey, root);
      const queryResult = (await db.query(Query.select(Filter.everything())).run()).objects;
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

      expect((await db.query(Query.select(Filter.everything())).run()).objects.length).to.eq(2);
      const rootDocHandle = db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle();
      const anotherDocHandle = getObjectCore(obj2).docHandle!;
      anotherDocHandle.change((doc: DatabaseDirectory) => {
        doc.objects![obj1.id] = getObjectCore(obj1).docHandle!.doc().objects![obj1.id];
      });
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = anotherDocHandle.url;
      });
      await db.flush();
      await peer.host.queryService.reindex();

      root = rootDocHandle.url;
      assertion = { objectId: obj2.id, documentUrl: anotherDocHandle.url };
    }

    await peer.reload();

    {
      const db = await peer.openDatabase(spaceKey, root);
      const queryResult = (await db.query(Query.select(Filter.everything())).run()).objects;
      expect(queryResult.length).to.eq(2);
      const object = queryResult.find((o) => o.id === assertion.objectId)!;
      expect(getObjectCore(object).docHandle!.url).to.eq(assertion.documentUrl);
      expect(queryResult.find((o) => o.id !== assertion.objectId)).not.to.be.undefined;
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

    const queryResult = (await db.query(Query.select(Filter.everything())).run()).objects;
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

  test('map over refs in query result', async () => {
    const { db } = await builder.createDatabase();
    const folder = db.add(live(Expando, { name: 'folder', objects: [] as any[] }));
    const objects = range(3).map((idx) => createTestObject(idx));
    for (const object of objects) {
      folder.objects.push(Ref.make(object));
    }

    const queryResult = await db.query(Filter.type(Expando, { name: 'folder' })).run();
    const result = queryResult.objects.flatMap(({ objects }) => objects.map((o: Ref<any>) => o.target));

    for (const i in objects) {
      expect(result[i]).to.eq(objects[i]);
    }
  });

  describe('Filter', () => {
    test('query objects with different versions', async () => {
      const ContactV1 = Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Contact', version: '0.1.0' }));

      const ContactV2 = Schema.Struct({
        name: Schema.String,
      }).pipe(Type.Obj({ typename: 'example.com/type/Contact', version: '0.2.0' }));

      const { peer, db } = await builder.createDatabase({ types: [ContactV1, ContactV2] });

      const contactV1 = db.add(live(ContactV1, { firstName: 'John', lastName: 'Doe' }));
      const contactV2 = db.add(live(ContactV2, { name: 'Brian Smith' }));
      await db.flush({ indexes: true });

      const assertQueries = async (db: EchoDatabase) => {
        await assertQuery(db, Filter.typename(ContactV1.typename), [contactV1, contactV2]);
        await assertQuery(db, Filter.type(ContactV1), [contactV1]);
        await assertQuery(db, Filter.type(ContactV2), [contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Contact')), [contactV1, contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Contact:0.1.0')), [contactV1]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Contact:0.2.0')), [contactV2]);
        await assertQuery(db, Filter.typeDXN(DXN.parse('dxn:type:example.com/type/Contact:0.2.0')), [contactV2]);
      };

      await assertQueries(db);

      await peer.reload();
      await assertQueries(await peer.openLastDatabase());
    });

    test('not(or) query', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.Contact, Testing.Task]);

      const _contact = db.add(live(Testing.Contact, {}));
      const _task = db.add(live(Testing.Task, {}));
      const expando = db.add(live(Expando, { name: 'expando' }));

      const query = db.query(
        Query.select(Filter.not(Filter.or(Filter.type(Testing.Contact), Filter.type(Testing.Task)))),
      );
      const result = await query.run();
      expect(result.objects).to.have.length(1);
      expect(result.objects[0]).to.eq(expando);
    });

    test('filter by refs', async () => {
      const { db } = await builder.createDatabase();

      const a = db.add(live(Expando, { name: 'a' }));
      const b = db.add(live(Expando, { name: 'b', owner: Ref.make(a) }));
      const _c = db.add(live(Expando, { name: 'c' }));

      const { objects } = await db.query(Query.select(Filter.type(Expando, { owner: Ref.make(a) }))).run();
      expect(objects).toEqual([b]);
    });

    test('query relation by type', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.Contact, Testing.HasManager]);

      const alice = db.add(
        live(Testing.Contact, {
          name: 'Alice',
        }),
      );
      const bob = db.add(
        live(Testing.Contact, {
          name: 'Bob',
        }),
      );
      const hasManager = db.add(
        live(Testing.HasManager, {
          [RelationSourceId]: bob,
          [RelationTargetId]: alice,
          since: '2022',
        }),
      );

      const { objects } = await db.query(Filter.type(Testing.HasManager)).run();
      expect(objects).toEqual([hasManager]);
    });
  });

  describe('Traversal', () => {
    let db: EchoDatabase;

    let alice: Live<Testing.Contact>, bob: Live<Testing.Contact>;

    beforeEach(async () => {
      ({ db } = await builder.createDatabase({ types: [Testing.Contact, Testing.HasManager, Testing.Task] }));

      // TODO(dmaretskyi): Better test data.
      alice = db.add(
        live(Testing.Contact, {
          name: 'Alice',
        }),
      );
      bob = db.add(
        live(Testing.Contact, {
          name: 'Bob',
        }),
      );
      const _hasManager = db.add(
        live(Testing.HasManager, {
          [RelationSourceId]: bob,
          [RelationTargetId]: alice,
          since: '2022',
        }),
      );

      const _task1 = db.add(live(Testing.Task, { title: 'Task 1', assignee: Ref.make(alice) }));
      const _task2 = db.add(live(Testing.Task, { title: 'Task 2', assignee: Ref.make(alice) }));
      const _task3 = db.add(live(Testing.Task, { title: 'Task 3', assignee: Ref.make(bob) }));

      await db.flush({ indexes: true });
    });

    test('traverse relation source to target', async () => {
      const { objects } = await db
        .query(
          Query.select(Filter.type(Testing.Contact, { name: 'Bob' }))
            .sourceOf(Testing.HasManager)
            .target(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse relation target to source', async () => {
      const { objects } = await db
        .query(
          Query.select(Filter.type(Testing.Contact, { name: 'Alice' }))
            .targetOf(Testing.HasManager)
            .source(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Bob' }]);
    });

    test('traverse outbound references', async () => {
      const { objects } = await db
        .query(Query.select(Filter.type(Testing.Task, { title: 'Task 1' })).reference('assignee'))
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
      log.info('done testing');
    });

    test('traverse outbound array references', async () => {
      db.add(Obj.make(Type.Expando, { name: 'Contacts', objects: [Ref.make(alice)] }));
      await db.flush({ indexes: true });

      const { objects } = await db
        .query(Query.select(Filter.type(Expando, { name: 'Contacts' })).reference('objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse inbound references', async () => {
      const { objects } = await db
        .query(Query.select(Filter.type(Testing.Contact, { name: 'Alice' })).referencedBy(Testing.Task, 'assignee'))
        .run();

      // TODO(dmaretskyi): Sort in query result.
      expect(objects.sort((a, b) => a.title!.localeCompare(b.title!))).toMatchObject([
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
    });

    test('traverse inbound array references', async () => {
      db.add(Obj.make(Type.Expando, { name: 'Contacts', objects: [Ref.make(alice)] }));
      await db.flush({ indexes: true });

      const { objects } = await db
        .query(Query.select(Filter.type(Testing.Contact)).referencedBy(Type.Expando, 'objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Contacts' }]);
    });

    test('traverse query started from id', async () => {
      const { objects } = await db.query(Query.select(Filter.ids(bob.id)).sourceOf(Testing.HasManager).target()).run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('query union', async () => {
      const query1 = Query.select(Filter.type(Testing.Contact, { name: 'Alice' })).referencedBy(
        Testing.Task,
        'assignee',
      );
      const query2 = Query.select(Filter.type(Testing.Contact, { name: 'Bob' })).referencedBy(Testing.Task, 'assignee');
      const query = Query.all(query1, query2);
      const { objects } = await db.query(query).run();
      expect(objects).toHaveLength(3);
    });

    test('query set difference', async () => {
      const query1 = Query.select(Filter.type(Testing.Contact));
      const query2 = Query.select(Filter.type(Testing.Contact)).sourceOf(Testing.HasManager).source();
      const query = Query.without(query1, query2);
      const { objects } = await db.query(query).run();
      expect(objects).toEqual([alice]);
    });
  });

  describe.skip('text search', () => {
    beforeEach(async () => {});

    test.skipIf(process.env.CI)('vector', async () => {
      const { db } = await builder.createDatabase({ indexing: { vector: true }, types: [Testing.Task] });

      db.add(live(Testing.Task, { title: 'apples' }));
      db.add(live(Testing.Task, { title: 'giraffes' }));

      await db.flush({ indexes: true });

      {
        const { objects } = await db.query(Query.select(Filter.text('apples', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('apples');
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('giraffes', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('giraffes');
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('vegetable', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('apples');
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('animal', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('giraffes');
      }
    });

    // TODO(wittjosiah): Currently disabled by default because it's expensive.
    test.skip('full-text', async () => {
      const { db } = await builder.createDatabase({ indexing: { fullText: true }, types: [Testing.Task] });

      db.add(live(Testing.Task, { title: 'apples' }));
      db.add(live(Testing.Task, { title: 'giraffes' }));

      await db.flush({ indexes: true });

      {
        const { objects } = await db.query(Query.select(Filter.text('apples', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('apples');
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('giraffes', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('giraffes');
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('vegetable', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }

      {
        const { objects } = await db.query(Query.select(Filter.text('animal', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });
  });

  describe('Reactivity', () => {
    let db: EchoDatabase;
    let objects: Live<Expando>[];

    beforeEach(async () => {
      ({ db } = await builder.createDatabase());

      objects = range(3).map((idx) => createTestObject(idx, 'red'));
      for (const object of objects) {
        db.add(object);
      }

      await db.flush({ indexes: true });
    });

    test('fires only once when new objects are added', async () => {
      const query = db.query(Query.select(Filter.type(Expando, { label: 'red' })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      let lastResult;
      query.subscribe(() => {
        count++;
        lastResult = query.objects;
      });
      expect(count).to.equal(0);

      db.add(createTestObject(3, 'red'));
      await db.flush({ updates: true, indexes: true });
      expect(count).to.equal(1);
      expect(lastResult).to.have.length(4);
    });

    test('fires only once when objects are removed', async () => {
      const query = db.query(Query.select(Filter.type(Expando, { label: 'red' })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      query.subscribe(() => {
        console.log('query.objects', query.objects);
        count++;
        expect(query.objects).to.have.length(2);
      });
      db.remove(objects[0]);
      await db.flush({ updates: true, indexes: true });
      expect(count).to.equal(1);
    });

    test('does not fire on object updates', async () => {
      const query = db.query(Query.select(Filter.type(Expando, { label: 'red' })));
      expect(query.runSync()).to.have.length(3);

      let updateCount = 0;
      query.subscribe(() => {
        updateCount++;
      });
      objects[0].title = 'Task 0a';
      await sleep(10);
      expect(updateCount).to.equal(0);
    });

    test('can unsubscribe and resubscribe', async () => {
      const query = db.query(Query.select(Filter.type(Expando, { label: 'red' })));

      let count = 0;
      let lastCount = 0;
      let lastResult;
      const unsubscribe = query.subscribe(() => {
        count++;
        lastResult = query.objects;
      });
      expect(count, 'Does not fire updates immediately.').to.equal(0);

      {
        db.add(createTestObject(3, 'red'));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(4);
      }

      unsubscribe();

      {
        db.add(createTestObject(4, 'red'));
        await db.flush({ updates: true });
        expect(count).to.be.equal(lastCount);
        lastCount = count;
      }

      query.subscribe(() => {
        count++;
        lastResult = query.objects;
      });

      {
        db.add(createTestObject(5, 'red'));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(6);
      }
    });

    test('multiple queries do not influence each other', async (ctx) => {
      const query1 = db.query(Query.select(Filter.type(Expando, { label: 'red' })));
      const query2 = db.query(Query.select(Filter.type(Expando, { label: 'red' })));

      let count1 = 0;
      let count2 = 0;
      query1.subscribe(() => {
        count1++;
      });
      query2.subscribe(() => {
        count2++;
      });

      db.add(createTestObject(6, 'red'));
      await db.flush({ updates: true, indexes: true });

      expect(count1).toEqual(1);
      expect(count2).toEqual(1);
    });

    test('deleting an element', async (ctx) => {
      const { db } = await builder.createDatabase({ types: [Testing.Contact] });

      // Create 3 test objects: Alice, Bob, Charlie.
      const alice = db.add(Obj.make(Testing.Contact, { name: 'Alice' }));
      const bob = db.add(Obj.make(Testing.Contact, { name: 'Bob' }));
      const charlie = db.add(Obj.make(Testing.Contact, { name: 'Charlie' }));
      await db.flush({ indexes: true });

      // Track all updates to observe the bug.
      const updates: string[][] = [];
      const unsub = db.query(Query.select(Filter.type(Testing.Contact))).subscribe(
        (query) => {
          const names = query.objects.map((obj) => obj.name!);
          updates.push(names);
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await sleep(100);

      // THE BUG REPRODUCTION: Delete Bob.
      db.remove(bob);

      // Wait for all reactive updates to complete.
      await sleep(500);

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
      const objects = Array.from({ length: 10 }, (_, i) => db.add(Obj.make(Expando, { value: i + 1 })));
      await db.flush({ indexes: true });

      // Track all updates to observe the bug.
      const updates: Set<number>[] = [];
      const unsub = db.query(Query.select(Filter.type(Expando))).subscribe(
        (query) => {
          const values = query.objects.map((obj) => obj.value);
          updates.push(new Set(values));
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await sleep(100);

      // THE BUG REPRODUCTION: Delete all items in a loop.
      for (const item of objects) {
        db.remove(item);
      }

      // Wait for all reactive updates to complete.
      await sleep(500);

      // TODO(ZaymonFC): Remove this comment once the bulk delete bug is resolved.
      /*
       * NOTE(ZaymonFC):
       *   Expected: 3 renders
       *   1. [] (empty)
       *   2. [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] (all loaded, order doesn't matter)
       *   3. [] (all deleted)
       *
       *   Actual: 3 renders
       *   1. [] (empty)
       *   2. [1, 4, 10, 5, 2, 9, 3, 8, 6, 7] (loaded)
       *   3. [1, 4, 10, 5, 2, 9, 3, 8, 6, 7] (NO CHANGE - bulk delete didn't work!)
       */

      // Convert to sets for order-independent comparison.
      expect(updates).toEqual([
        new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), // All objects loaded.
        new Set([]), // All items deleted.
      ]);
    });
  });

  describe('Dynamic types', () => {
    let db: EchoDatabase, graph: Hypergraph;

    beforeEach(async () => {
      ({ db, graph } = await builder.createDatabase());
    });

    test('query by typename receives updates', async () => {
      graph.schemaRegistry.addSchema([Testing.Contact]);
      const contact = db.add(live(Testing.Contact, {}));
      const name = 'DXOS User';

      const query = db.query(Filter.typename(Testing.Contact.typename));
      const result = await query.run();
      expect(result.objects).to.have.length(1);
      expect(result.objects[0]).to.eq(contact);

      const nameUpdate = new Trigger();
      const anotherContactAdded = new Trigger();
      const unsub = query.subscribe(({ objects }) => {
        if (objects.some((obj) => obj.name === name)) {
          nameUpdate.wake();
        }
        if (objects.length === 2) {
          anotherContactAdded.wake();
        }
      });
      onTestFinished(() => unsub());

      contact.name = name;
      db.add(live(Testing.Contact, {}));

      await asyncTimeout(nameUpdate.wait(), 1000);
      await asyncTimeout(anotherContactAdded.wait(), 1000);
    });

    test('query mutable schema objects', async () => {
      const [schema] = await db.schemaRegistry.register([Testing.Contact]);
      const contact = db.add(live(schema, {}));

      // NOTE: Must use `Filter.type` with EchoSchema instance since matching is done by the object ID of the mutable schema.
      const query = db.query(Query.type(schema));
      const result = await query.run();
      expect(result.objects).to.have.length(1);
      expect(result.objects[0]).to.eq(contact);
    });

    test('`instanceof` operator works', async () => {
      graph.schemaRegistry.addSchema([Testing.Contact]);
      const name = 'DXOS User';
      const contact = live(Testing.Contact, { name });
      db.add(contact);
      expect(contact instanceof Testing.Contact).to.be.true;

      // query
      {
        const contact = (await db.query(Filter.type(Testing.Contact)).run()).objects[0];
        expect(contact.name).to.eq(name);
        expect(contact instanceof Testing.Contact).to.be.true;
      }
    });
  });
});

const createObjects = async (peer: EchoTestPeer, db: EchoDatabase, options: { count: number }) => {
  const objects = range(options.count, (v) => db.add(createTestObject(v, String(v))));
  await db.flush({ indexes: true });
  return objects;
};

const assertQuery = async (db: EchoDatabase, filter: Filter.Any, expected: any[]) => {
  const { objects } = await db.query(Query.select(filter)).run();
  expect(sortById(objects)).toEqual(expect.arrayContaining(sortById(expected)));
};

const sortById = (objects: any[]) => objects.sort((a, b) => a.id.localeCompare(b.id));
