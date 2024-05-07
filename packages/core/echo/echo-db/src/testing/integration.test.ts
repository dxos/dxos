//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { EchoTestBuilder, createDataAssertion } from './echo-test-builder';
import { TestReplicationNetwork } from './test-replicator';
import { AnyDocumentId } from '@dxos/automerge/src/automerge-repo';
import { log } from '@dxos/log';

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

  // TODO(dmaretskyi): packages/core/echo/echo-pipeline/src/automerge/automerge-doc-loader.ts:92 INFO AutomergeDocumentLoaderImpl#7 loading delayed until object links are initialized
  test.skip('reopen peer', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await peer.close();
    await peer.open();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
    await dataAssertion.verify(db2);
  });

  // TODO(dmaretskyi): packages/core/echo/echo-pipeline/src/automerge/automerge-doc-loader.ts:92 INFO AutomergeDocumentLoaderImpl#7 loading delayed until object links are initialized
  test.skip('reload peer', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await peer.reload();

    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!);
    await dataAssertion.verify(db2);
  });

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
});
