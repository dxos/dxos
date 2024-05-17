//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { TestBuilder as TeleportTestBuilder, TestPeer as TeleportTestPeer } from '@dxos/teleport/testing';

import { EchoTestBuilder, createDataAssertion } from './echo-test-builder';
import { TestReplicationNetwork } from './test-replicator';
import { defer, deferAsync } from '@dxos/util';

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

    await peer.reload();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
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
  })

  test('2 clients', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();

    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, { client: client2 });
    await dataAssertion.verify(db2);
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

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await dataAssertion.verify(db2);
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

    peer1.host.authorizeDevice(spaceKey, teleportPeer2.peerId);
    peer2.host.authorizeDevice(spaceKey, teleportPeer1.peerId);

    // TODO(dmaretskyi): No need to call `peer1.host.replicateDocument`.

    await using db1 = await peer1.createDatabase(spaceKey);
    await dataAssertion.seed(db1);

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await dataAssertion.verify(db2);
  });
});
