//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { EchoTestBuilder, createDataAssertion } from './echo-test-builder';

describe('Integration tests', () => {
  test('read/write to one database', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion({ referenceEquality: true });
    await using peer = await builder.createPeer();

    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);
    await dataAssertion.verify(db);
  });

  // TODO(dmaretskyi): packages/core/echo/echo-pipeline/src/automerge/automerge-doc-loader.ts:92 INFO AutomergeDocumentLoaderImpl#7 loading delayed until object links are initialized
  test.skip('reopen peer', async () => {
    await using builder = await new EchoTestBuilder().open();
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
    await using builder = await new EchoTestBuilder().open();
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
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    const dataAssertion = createDataAssertion();

    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);
    await dataAssertion.seed(db);

    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, { client: client2 });
    await dataAssertion.verify(db2);
  });
});
