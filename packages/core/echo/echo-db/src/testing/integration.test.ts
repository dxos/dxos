//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import {
  brokenAutomergeReplicatorFactory,
  testAutomergeReplicatorFactory,
  TestReplicationNetwork,
} from '@dxos/echo-pipeline/testing';
import { create, Expando } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { PublicKey } from '@dxos/keys';
import { TestBuilder as TeleportTestBuilder, TestPeer as TeleportTestPeer } from '@dxos/teleport/testing';
import { describe, test } from '@dxos/test';
import { deferAsync } from '@dxos/util';

import { createDataAssertion, EchoTestBuilder } from './echo-test-builder';

describe('Integration tests', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('read/write to one database', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion({ referenceEquality: true });
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);
    await dataAssertion.verify(db);
  });

  test('reopen peer', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await peer.host.updateIndexes();
    await peer.close();
    await peer.open();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
    await dataAssertion.verify(db2);
  });

  test('reopen peer - updating indexes after restart', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await peer.close();
    await peer.open();
    await peer.host.updateIndexes();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
    await dataAssertion.verify(db2);
  });

  test('reload peer', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);
    await db.flush();
    const heads = await db.coreDatabase.getDocumentHeads();

    await peer.reload();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
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

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
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

  test('references are loaded lazily nad receive signal notifications', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();

    let rootUrl: string;
    let outerId: string;
    {
      await using db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl!;
      const inner = db.add({ name: 'inner' });
      const outer = db.add({ inner });
      outerId = outer.id;
      await db.flush();
    }

    await peer.reload();
    {
      await using db = await peer.openDatabase(spaceKey, rootUrl);
      const outer = (await db.loadObjectById(outerId)) as any;
      const loaded = new Trigger();
      using updates = updateCounter(() => {
        if (outer.inner) {
          loaded.wake();
        }
      });
      expect(outer.inner).to.eq(undefined);

      await loaded.wait();
      expect(outer.inner).to.include({ name: 'inner' });
      expect(updates.count).to.eq(1);
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
    teleportConnections[0].teleport.addExtension('replicator', peer1.host.createReplicationExtension());
    teleportConnections[1].teleport.addExtension('replicator', peer2.host.createReplicationExtension());

    await peer1.host.authorizeDevice(spaceKey, teleportPeer2.peerId);
    await peer2.host.authorizeDevice(spaceKey, teleportPeer1.peerId);

    // TODO(dmaretskyi): No need to call `peer1.host.replicateDocument`.

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

  test('peers disconnect if replication is broken', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const teleportTestBuilder = new TeleportTestBuilder();
    await using _ = deferAsync(() => teleportTestBuilder.destroy());

    await using peer1 = await builder.createPeer();
    await using peer2 = await builder.createPeer();

    const [teleportPeer1, teleportPeer2] = teleportTestBuilder.createPeers({ factory: () => new TeleportTestPeer() });
    const teleportConnections = await teleportTestBuilder.connect(teleportPeer1, teleportPeer2);
    teleportConnections[0].teleport.addExtension(
      'replicator',
      peer1.host.createReplicationExtension(brokenAutomergeReplicatorFactory),
    );
    teleportConnections[1].teleport.addExtension(
      'replicator',
      peer2.host.createReplicationExtension(testAutomergeReplicatorFactory),
    );

    await peer1.host.authorizeDevice(spaceKey, teleportPeer2.peerId);
    await peer2.host.authorizeDevice(spaceKey, teleportPeer1.peerId);

    await teleportConnections[0].whenOpen(true);
    await using db1 = await peer1.createDatabase(spaceKey);
    db1.add(create(Expando, {}));
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

      await waitForExpect(async () => {
        const state = await db2.coreDatabase.getSyncState();

        expect(state.peers!.length).to.eq(1);
        expect(state.peers![0].documentsToReconcile).to.eq(0);
      });
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

  test('replication', async () => {
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
