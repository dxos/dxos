//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, Filter, Obj, Query, Relation, Type } from '@dxos/echo';
import { MeshEchoReplicator } from '@dxos/echo-host';
import {
  TestReplicationNetwork,
  brokenAutomergeReplicatorFactory,
  testAutomergeReplicatorFactory,
} from '@dxos/echo-host/testing';
import { Ref, getTypeAnnotation } from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';
import { DXN, type EntityId, PublicKey, type URI } from '@dxos/keys';
import { TestBuilder as TeleportTestBuilder, TestPeer as TeleportTestPeer } from '@dxos/teleport/testing';
import { deferAsync } from '@dxos/util';

import { EchoTestBuilder, createDataAssertion } from './echo-test-builder';

describe('Integration tests', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('read/write to one database', async () => {
    const dataAssertion = createDataAssertion({ referenceEquality: true });
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase();
    await dataAssertion.seed(db);
    await dataAssertion.verify(db);
  });

  test('reopen peer', async () => {
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase();
    await dataAssertion.seed(db);

    await peer.host.updateIndexes();
    await peer.close();
    await peer.open();

    await using db2 = await peer.openLastDatabase();
    await dataAssertion.verify(db2);
  });

  test('reopen peer - updating indexes after restart', async () => {
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase();
    await dataAssertion.seed(db);

    await peer.close();
    await peer.open();
    await peer.host.updateIndexes();

    await using db2 = await peer.openLastDatabase();
    await dataAssertion.verify(db2);
  });

  test('reload peer', async () => {
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase();
    await dataAssertion.seed(db);
    await db.flush();
    const heads = await db.getDocumentHeads();

    await peer.reload();

    await using db2 = await peer.openLastDatabase();
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();
    await dataAssertion.verify(db2);
  });

  test('reload peer -- save index before restart', { timeout: 60_000 }, async () => {
    const NUM_OBJECTS = 100;
    await using peer = await builder.createPeer({
      types: [TestSchema.Person],
    });

    await using db = await peer.createDatabase();
    for (let i = 0; i < NUM_OBJECTS; i++) {
      db.add(Obj.make(TestSchema.Person, { name: `Person ${i}` }));
    }
    await db.flush();
    await peer.host.updateIndexes();

    await peer.reload();
    await using db2 = await peer.openLastDatabase();
    const objects = await db2.query(Query.select(Filter.type(TestSchema.Person))).run();
    expect(objects.length).to.eq(NUM_OBJECTS);
  });

  test('client restart with open host', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await peer.host.updateIndexes();
    await peer.client.close();
    await peer.client.open();

    await using db2 = await peer.openLastDatabase();
    await dataAssertion.verify(db2);
  });

  test('2 clients', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();

    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);
    await db.flush();
    const heads = await db.getDocumentHeads();

    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, {
      client: client2,
    });
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();
    await dataAssertion.verify(db2);
  });

  test('2 clients receive reactive notifications for new objects', async () => {
    const [spaceKey] = PublicKey.randomSequence();

    await using peer = await builder.createPeer({
      types: [TestSchema.Person],
    });

    // Client 1 creates the database.
    await using db1 = await peer.createDatabase(spaceKey);

    // Client 2 opens the same database.
    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db1.rootUrl!, {
      client: client2,
    });

    // Set up a listener for update events on db2 BEFORE client 1 creates the object.
    const updateReceived = new Trigger();
    const updateQuery = db2.query(Filter.type(TestSchema.Person));
    const unsubscribe = updateQuery.subscribe(() => {
      if (updateQuery.results.length > 0) {
        updateReceived.wake();
      }
    });

    // Client 1 creates an object.
    const person = db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    await db1.flush();

    // Client 2 should receive an update event (reactive notification) within a reasonable time.
    // The notification should arrive within ~1000ms (accounting for throttling and document loading).
    await asyncTimeout(updateReceived.wait(), 1000);
    unsubscribe();

    // Verify the object is visible on client 2.
    const objects = await db2.query(Filter.type(TestSchema.Person)).run();
    expect(objects.length).toBe(1);
    expect(objects[0].name).toBe('Alice');
    expect(objects[0].id).toBe(person.id);
  });

  // TODO(dmaretskyi): Test that accessing the ref DXN doesn't load the target.
  test('references are loaded lazily and can be loaded via load()', async () => {
    await using peer = await builder.createPeer();

    let outerId: string;
    {
      await using db = await peer.createDatabase();
      const inner = db.add(Obj.make(TestSchema.Expando, { name: 'inner' }));
      const outer = db.add(Obj.make(TestSchema.Expando, { inner: Ref.make(inner) }));
      outerId = outer.id;
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase();
      const outer = (await db.query(Filter.id(outerId)).first()) as any;
      expect(outer.inner.target).to.eq(undefined);

      // Use explicit load() to load the reference.
      const loaded = await outer.inner.load();
      expect(loaded).to.include({ name: 'inner' });
      expect(outer.inner.target).to.include({ name: 'inner' });
    }
  });

  test('references can be loaded explicitly using ref.load()', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();

    let rootUrl: string;
    let outerId: string;
    {
      await using db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl!;
      const inner = db.add(Obj.make(TestSchema.Expando, { name: 'inner' }));
      const outer = db.add(Obj.make(TestSchema.Expando, { inner: Ref.make(inner) }));
      outerId = outer.id;
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openDatabase(spaceKey, rootUrl);
      const outer = (await db.query(Filter.id(outerId)).first()) as any;
      expect(outer.inner.target).to.eq(undefined);

      const target = await outer.inner.load();
      expect(target).to.include({ name: 'inner' });
      expect(outer.inner.target).to.include({ name: 'inner' });
      expect(outer.inner.target === target).to.be.true;
    }
  });

  test('database object resolves a registry object via a DXN ref', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    // Register a type in the in-process registry — the "registry object".
    db.graph.registry.add([TestSchema.Person]);
    const typeDXN = DXN.make(Type.getTypename(TestSchema.Person), Type.getVersion(TestSchema.Person));

    // A database object holds a reference to the registry object via its DXN.
    const object = db.add(Obj.make(TestSchema.Expando, { type: db.makeRef(typeDXN) })) as any;
    await db.flush();

    // A DXN ref into the in-process registry resolves synchronously (resolveSync),
    // since the registry is in-memory — no async load is required.
    const target = object.type.target;
    expect(Type.isType(target)).to.be.true;
    expect(Type.getTypename(target)).to.eq(Type.getTypename(TestSchema.Person));

    // ref.load() routes through the resolver to the same registry entity.
    const loaded = await object.type.load();
    expect(loaded).to.eq(target);
  });

  test('database object resolves a keyed (non-type) registry object via a key DXN ref', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    // Register a keyed (non-type) entity in the in-process registry — e.g. an operation descriptor.
    const registryObject = Obj.make(TestSchema.Expando, {
      [Obj.Meta]: { key: 'org.example.function.translate', version: '0.1.0' },
      label: 'Translate',
    });
    db.graph.registry.add([registryObject]);
    const keyDXN = DXN.make('org.example.function.translate', '0.1.0');

    // A database object holds a reference to the registry object via its key DXN.
    const object = db.add(Obj.make(TestSchema.Expando, { fn: db.makeRef(keyDXN) })) as any;
    await db.flush();

    // The key DXN resolves synchronously to the in-memory registry entity.
    const target = object.fn.target;
    expect(target).to.eq(registryObject);

    // ref.load() routes through the resolver to the same registry entity.
    const loaded = await object.fn.load();
    expect(loaded).to.eq(registryObject);
  });

  test('replication', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion();

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.getDocumentHeads();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });

  test('replicating 2 databases', async () => {
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion();

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    {
      await using db1 = await peer1.createDatabase(spaceKey1);
      await dataAssertion.seed(db1);
      await db1.flush();
      const heads = await db1.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey1, db1.rootUrl!);
      await db2.waitUntilHeadsReplicated(heads);
      await db2.updateIndexes();
      await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
      await dataAssertion.verify(db2);
    }

    {
      await using db1 = await peer1.createDatabase(spaceKey2);
      await dataAssertion.seed(db1);
      await db1.flush();
      const heads = await db1.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey2, db1.rootUrl!);
      await db2.waitUntilHeadsReplicated(heads);
      await db2.updateIndexes();
      await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
      await dataAssertion.verify(db2);
    }
  });

  test('replication through MESH', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    const teleportTestBuilder = new TeleportTestBuilder();
    await using _ = deferAsync(() => teleportTestBuilder.destroy());

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();

    const [teleportPeer1, teleportPeer2] = teleportTestBuilder.createPeers({
      factory: () => new TeleportTestPeer(),
    });
    const teleportConnections = await teleportTestBuilder.connect(teleportPeer1, teleportPeer2);
    const replicator1 = new MeshEchoReplicator();
    const replicator2 = new MeshEchoReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);
    teleportConnections[0].teleport.addExtension('replicator', replicator1.createExtension());
    teleportConnections[1].teleport.addExtension('replicator', replicator2.createExtension());

    await replicator1.authorizeDevice(spaceKey, teleportPeer2.peerId);
    await replicator2.authorizeDevice(spaceKey, teleportPeer1.peerId);

    // TODO(dmaretskyi): No need to call `peer1.host.replicateDocument`.

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.getDocumentHeads();

    await using db2 = await asyncTimeout(peer2.openDatabase(spaceKey, db1.rootUrl!), 1_000);
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });

  test('peers disconnect if replication is broken', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const teleportTestBuilder = new TeleportTestBuilder();
    await using _ = deferAsync(() => teleportTestBuilder.destroy());

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();

    const [teleportPeer1, teleportPeer2] = teleportTestBuilder.createPeers({
      factory: () => new TeleportTestPeer(),
    });
    const teleportConnections = await teleportTestBuilder.connect(teleportPeer1, teleportPeer2);
    const replicator1 = new MeshEchoReplicator();
    const replicator2 = new MeshEchoReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);
    teleportConnections[0].teleport.addExtension(
      'replicator',
      replicator1.createExtension(brokenAutomergeReplicatorFactory),
    );
    teleportConnections[1].teleport.addExtension(
      'replicator',
      replicator2.createExtension(testAutomergeReplicatorFactory),
    );

    await replicator1.authorizeDevice(spaceKey, teleportPeer2.peerId);
    await replicator2.authorizeDevice(spaceKey, teleportPeer1.peerId);

    await teleportConnections[0].whenOpen(true);
    await using db1 = await peer1.createDatabase(spaceKey);
    db1.add(Obj.make(TestSchema.Expando, {}));
    await teleportConnections[0].whenOpen(false);
  });

  test('replicating unloaded documents', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion({ numObjects: 10 });

    await using peer1 = await builder.createPeer();
    let rootUrl: string;
    {
      await using db1 = await peer1.createDatabase(spaceKey);
      rootUrl = db1.rootUrl!;
      await dataAssertion.seed(db1);
      await db1.flush();
    }

    await peer1.reload();

    {
      await using _db1 = await peer1.openDatabase(spaceKey, rootUrl);

      await using peer2 = await builder.createPeer();

      await peer1.host.addReplicator(Context.default(), await network.createReplicator());
      await peer2.host.addReplicator(Context.default(), await network.createReplicator());

      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);

      await expect
        .poll(async () => {
          const state = await db2.getSyncState();
          return state.peers!.length;
        })
        .toBe(1);

      await expect
        .poll(async () => {
          const state = await db2.getSyncState();
          return state.peers![0].differentDocuments + state.peers![0].missingOnRemote + state.peers![0].missingOnLocal;
        })
        .toEqual(0);
    }
  });

  test('replicate and load by id', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);

    const obj1 = db1.add(
      Obj.make(TestSchema.Expando, {
        content: 'test',
      }),
    );
    await db1.flush();
    await expect.poll(() => db2.getObjectById(obj1.id)).not.toEqual(undefined);
  });

  describe('relations', () => {
    test('relation source and target is eagerly loaded with the relation', async () => {
      await using peer = await builder.createPeer();
      await using db = await peer.createDatabase(PublicKey.random(), {
        reactiveSchemaQuery: false,
        preloadSchemaOnOpen: false,
      });
      db.graph.registry.add([TestSchema.Person, TestSchema.HasManager]);

      let relationId!: EntityId;
      {
        const alice = db.add(
          Obj.make(TestSchema.Person, {
            name: 'Alice',
          }),
        );
        const bob = db.add(
          Obj.make(TestSchema.Person, {
            name: 'Bob',
          }),
        );
        const hasManager = db.add(
          Relation.make(TestSchema.HasManager, {
            [Relation.Source]: bob,
            [Relation.Target]: alice,
          }),
        );
        relationId = hasManager.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase({
          reactiveSchemaQuery: false,
          preloadSchemaOnOpen: false,
        });
        const [obj] = await db.query(Filter.id(relationId)).run();
        assert(Relation.isRelation(obj), 'Query did not return a relation');
        const source = Relation.getSource(obj);
        const target = Relation.getTarget(obj);
        assert(Obj.instanceOf(TestSchema.Person, source), 'Relation source is not a person');
        assert(Obj.instanceOf(TestSchema.Person, target), 'Relation target is not a person');
        expect(source.name).toEqual('Bob');
        expect(target.name).toEqual('Alice');
      }
    });
  });

  describe('dynamic schema', () => {
    test('query object with dynamic schema', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer();

      let rootUrl: string, schemaDxn: URI.URI;
      {
        await using db = await peer.createDatabase(spaceKey);
        rootUrl = db.rootUrl!;

        const LocalTestSchema = Schema.Struct({
          field: Schema.String,
        }).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));
        const stored = await db.addType(LocalTestSchema);
        schemaDxn = Type.getURI(stored)!;

        const object = db.add(Obj.make(stored, { field: 'test' }));
        // After fork, the schema attached to objects is the rebuilt Effect Schema (from jsonSchema),
        // not identical to the Type.Type entity returned by register. Compare URIs instead.
        expect(Type.getURI(Obj.getType(object)!)).to.eq(Type.getURI(stored));

        db.add(Obj.make(TestSchema.Expando, { text: 'Expando object' })); // Add Expando object to test filtering
        await db.flush();
      }

      await peer.reload();
      {
        // Objects with stored schema get included in queries that select all objects..
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects.length).to.eq(3);
      }

      await peer.reload();
      {
        // Can query by stored schema DXN.
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const objects = await db.query(Query.select(Filter.type(schemaDxn))).run();
        expect(objects.length).to.eq(1);
        expect(getTypeAnnotation(Type.getSchema(Obj.getType(objects[0])!))).to.include({
          typename: 'com.example.type.test',
          version: '0.1.0',
        });
      }

      await peer.reload();
      {
        // Can query by stored schema ref. Persisted types live in the db (not the shared
        // registry), so resolve the stored Type entity via a space query.
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const types = await db.query(Filter.type(Type.Type)).run();
        const schema = types.find((t) => Type.getTypename(t) === 'com.example.type.test');

        const objects = await db.query(Filter.type(schema!)).run();
        expect(objects.length).to.eq(1);
        expect(getTypeAnnotation(Type.getSchema(Entity.getType(objects[0])!))).to.include({
          typename: 'com.example.type.test',
          version: '0.1.0',
        });
      }
    });
  });

  test('dynamic schema is eagerly loaded with objects', async () => {
    await using peer = await builder.createPeer();

    let typeURI!: URI.URI;
    {
      await using db = await peer.createDatabase(PublicKey.random(), {
        reactiveSchemaQuery: false,
        preloadSchemaOnOpen: false,
      });
      const schema = await db.addType(TestSchema.Person);
      typeURI = Type.getURI(schema)!;
      db.add(Obj.make(schema, { name: 'Bob' }));
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase({
        reactiveSchemaQuery: false,
        preloadSchemaOnOpen: false,
      });
      const [obj] = await db.query(Query.select(Filter.type(typeURI))).run();
      expect(Obj.getType(obj)).toBeDefined();
      expect(Type.getTypename(Obj.getType(obj)!)).toEqual(Type.getTypename(TestSchema.Person));
    }
  });

  test('deleted objects remain deleted after reload', async () => {
    await using peer = await builder.createPeer({
      types: [TestSchema.Person],
    });

    {
      await using db = await peer.createDatabase();
      const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      await db.flush();

      // Verify object exists before deletion.
      const beforeDelete = await db.query(Filter.type(TestSchema.Person)).run();
      expect(beforeDelete.length).to.eq(1);

      // Delete the object.
      db.remove(person);
      await db.flush();

      // Verify object is deleted before reload.
      const afterDelete = await db.query(Filter.type(TestSchema.Person)).run();
      expect(afterDelete.length).to.eq(0);
    }

    await peer.reload();

    {
      await using db = await peer.openLastDatabase();

      // Verify object is still not returned in normal queries.
      const objects = await db.query(Filter.type(TestSchema.Person)).run();
      expect(objects.length).to.eq(0);

      // Verify object appears in deleted-only query.
      const deletedObjects = await db
        .query(Query.select(Filter.type(TestSchema.Person)).options({ deleted: 'only' }))
        .run();
      expect(deletedObjects.length).to.eq(1);
      expect(deletedObjects[0].name).to.eq('Alice');
      expect(Obj.isDeleted(deletedObjects[0])).to.be.true;
    }
  });
});

describe('load tests', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const NUM_OBJECTS = 100;

  test('replication', { timeout: 20_000 }, async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion({ numObjects: NUM_OBJECTS });

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.getDocumentHeads();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.waitUntilHeadsReplicated(heads);
    await db2.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });
});
