//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { asyncTimeout, Trigger } from '@dxos/async';
import { MeshEchoReplicator } from '@dxos/echo-pipeline';
import {
  brokenAutomergeReplicatorFactory,
  testAutomergeReplicatorFactory,
  TestReplicationNetwork,
} from '@dxos/echo-pipeline/testing';
import {
  Expando,
  getTypeAnnotation,
  getSchemaTypename,
  getTypeReference,
  RelationSourceId,
  RelationTargetId,
  TypedObject,
  type ObjectId,
  Ref,
} from '@dxos/echo-schema';
import { getSchema } from '@dxos/echo-schema';
import { Testing, updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { DXN, PublicKey } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { TestBuilder as TeleportTestBuilder, TestPeer as TeleportTestPeer } from '@dxos/teleport/testing';
import { deferAsync } from '@dxos/util';

import { createDataAssertion, EchoTestBuilder } from './echo-test-builder';
import { getSource, getTarget } from '../echo-handler/relations';
import { Filter, Query } from '../query';

registerSignalsRuntime();

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
    const heads = await db.coreDatabase.getDocumentHeads();

    await peer.reload();

    await using db2 = await peer.openLastDatabase();
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.updateIndexes();
    await dataAssertion.verify(db2);
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
    const heads = await db.coreDatabase.getDocumentHeads();

    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, { client: client2 });
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.updateIndexes();
    await dataAssertion.verify(db2);
  });

  // TODO(dmaretskyi): Test Ref.load() too.
  // TODO(dmaretskyi): Test that accessing the ref DXN doesn't load the target.
  test('references are loaded lazily and receive signal notifications', async () => {
    await using peer = await builder.createPeer();

    let outerId: string;
    {
      await using db = await peer.createDatabase();
      const inner = db.add({ name: 'inner' });
      const outer = db.add({ inner: Ref.make(inner) });
      outerId = outer.id;
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase();
      const outer = (await db.query(Filter.ids(outerId)).first()) as any;
      const loaded = new Trigger();
      using updates = updateCounter(() => {
        if (outer.inner.target) {
          loaded.wake();
        }
      });
      expect(outer.inner.target).to.eq(undefined);

      await loaded.wait();
      expect(outer.inner.target).to.include({ name: 'inner' });
      expect(updates.count).to.eq(1);
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
      const inner = db.add({ name: 'inner' });
      const outer = db.add({ inner: Ref.make(inner) });
      outerId = outer.id;
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openDatabase(spaceKey, rootUrl);
      const outer = (await db.query(Filter.ids(outerId)).first()) as any;
      expect(outer.inner.target).to.eq(undefined);

      const target = await outer.inner.load();
      expect(target).to.include({ name: 'inner' });
      expect(outer.inner.target).to.include({ name: 'inner' });
      expect(outer.inner.target === target).to.be.true;
    }
  });

  test('replication', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion();

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.coreDatabase.getDocumentHeads();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });

  test('replicating 2 databases', async () => {
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    const dataAssertion = createDataAssertion();

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();
    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    {
      await using db1 = await peer1.createDatabase(spaceKey1);
      await dataAssertion.seed(db1);
      await db1.flush();
      const heads = await db1.coreDatabase.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey1, db1.rootUrl!);
      await db2.coreDatabase.waitUntilHeadsReplicated(heads);
      await db2.coreDatabase.updateIndexes();
      await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
      await dataAssertion.verify(db2);
    }

    {
      await using db1 = await peer1.createDatabase(spaceKey2);
      await dataAssertion.seed(db1);
      await db1.flush();
      const heads = await db1.coreDatabase.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey2, db1.rootUrl!);
      await db2.coreDatabase.waitUntilHeadsReplicated(heads);
      await db2.coreDatabase.updateIndexes();
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

    const [teleportPeer1, teleportPeer2] = teleportTestBuilder.createPeers({ factory: () => new TeleportTestPeer() });
    const teleportConnections = await teleportTestBuilder.connect(teleportPeer1, teleportPeer2);
    const replicator1 = new MeshEchoReplicator();
    const replicator2 = new MeshEchoReplicator();
    await peer1.host.addReplicator(replicator1);
    await peer2.host.addReplicator(replicator2);
    teleportConnections[0].teleport.addExtension('replicator', replicator1.createExtension());
    teleportConnections[1].teleport.addExtension('replicator', replicator2.createExtension());

    await replicator1.authorizeDevice(spaceKey, teleportPeer2.peerId);
    await replicator2.authorizeDevice(spaceKey, teleportPeer1.peerId);

    // TODO(dmaretskyi): No need to call `peer1.host.replicateDocument`.

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.coreDatabase.getDocumentHeads();

    await using db2 = await asyncTimeout(peer2.openDatabase(spaceKey, db1.rootUrl!), 1_000);
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });

  test('peers disconnect if replication is broken', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const teleportTestBuilder = new TeleportTestBuilder();
    await using _ = deferAsync(() => teleportTestBuilder.destroy());

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();

    const [teleportPeer1, teleportPeer2] = teleportTestBuilder.createPeers({ factory: () => new TeleportTestPeer() });
    const teleportConnections = await teleportTestBuilder.connect(teleportPeer1, teleportPeer2);
    const replicator1 = new MeshEchoReplicator();
    const replicator2 = new MeshEchoReplicator();
    await peer1.host.addReplicator(replicator1);
    await peer2.host.addReplicator(replicator2);
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
    db1.add(live(Expando, {}));
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

      await peer1.host.addReplicator(await network.createReplicator());
      await peer2.host.addReplicator(await network.createReplicator());

      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);

      await expect
        .poll(async () => {
          const state = await db2.coreDatabase.getSyncState();
          return state.peers!.length;
        })
        .toBe(1);

      await expect
        .poll(async () => {
          const state = await db2.coreDatabase.getSyncState();
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
    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);

    const obj1 = db1.add(
      live({
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
      db.graph.schemaRegistry.addSchema([Testing.Contact, Testing.HasManager]);

      let relationId!: ObjectId;
      {
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
        relationId = hasManager.id;
        await db.flush({ indexes: true });
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase({ reactiveSchemaQuery: false, preloadSchemaOnOpen: false });
        const {
          objects: [obj],
        } = await db.query(Filter.ids(relationId)).run();
        expect(getSource(obj).name).toEqual('Bob');
        expect(getTarget(obj).name).toEqual('Alice');
      }
    });
  });

  describe('dynamic schema', () => {
    test('query object with dynamic schema', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer();

      let rootUrl: string, schemaDxn: string;
      {
        await using db = await peer.createDatabase(spaceKey);
        rootUrl = db.rootUrl!;

        class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
          field: Schema.String,
        }) {}
        const [stored] = await db.schemaRegistry.register([TestSchema]);
        schemaDxn = DXN.fromLocalObjectId(stored.id).toString();

        const object = db.add(live(stored, { field: 'test' }));
        expect(getSchema(object)).to.eq(stored);

        db.add({ text: 'Expando object' }); // Add Expando object to test filtering
        await db.flush({ indexes: true });
      }

      await peer.reload();
      {
        // Objects with stored schema get included in queries that select all objects..
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const { objects } = await db.query(Query.select(Filter.everything())).run();
        expect(objects.length).to.eq(3);
      }

      await peer.reload();
      {
        // Can query by stored schema DXN.
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const { objects } = await db.query(Query.select(Filter.typeDXN(DXN.parse(schemaDxn)))).run();
        expect(objects.length).to.eq(1);
        expect(getTypeAnnotation(getSchema(objects[0])!)).to.include({
          typename: 'example.com/type/Test',
          version: '0.1.0',
        });
      }

      await peer.reload();
      {
        // Can query by stored schema ref.
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        const schema = db.schemaRegistry.getSchema('example.com/type/Test');

        const { objects } = await db.query(Filter.type(schema!)).run();
        expect(objects.length).to.eq(1);
        expect(getTypeAnnotation(getSchema(objects[0])!)).to.include({
          typename: 'example.com/type/Test',
          version: '0.1.0',
        });
      }
    });
  });

  test('dynamic schema is eagerly loaded with objects', async () => {
    await using peer = await builder.createPeer();

    let typeDXN!: DXN;
    {
      await using db = await peer.createDatabase(PublicKey.random(), {
        reactiveSchemaQuery: false,
        preloadSchemaOnOpen: false,
      });
      const [schema] = await db.schemaRegistry.register([Testing.Contact]);
      typeDXN = getTypeReference(schema)!.toDXN();
      db.add(live(schema, { name: 'Bob' }));
      await db.flush({ indexes: true });
    }

    await peer.reload();
    {
      await using db = await peer.openLastDatabase({ reactiveSchemaQuery: false, preloadSchemaOnOpen: false });
      const {
        objects: [obj],
      } = await db.query(Query.select(Filter.typeDXN(typeDXN))).run();
      expect(getSchema(obj)).toBeDefined();
      expect(getSchemaTypename(getSchema(obj)!)).toEqual(Testing.Contact.typename);
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
    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);
    await db1.flush();
    const heads = await db1.coreDatabase.getDocumentHeads();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.coreDatabase.waitUntilHeadsReplicated(heads);
    await db2.coreDatabase.updateIndexes();
    await dataAssertion.waitForReplication(db2); // https://github.com/dxos/dxos/issues/7240
    await dataAssertion.verify(db2);
  });
});
