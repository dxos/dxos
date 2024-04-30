//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { EchoTestBuilder } from './echo-test-builder';

describe('Integration tests', () => {
  test('read/write to one database', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const { objects } = await db.query({ type: 'task' }).run();
    expect(objects).to.deep.eq([object]);
  });

  test('2 clients', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();

    const peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, { client: client2 });

    const { objects } = await db2.query({ type: 'task' }).run();
    expect(objects).to.have.length(1);
    expect({ ...objects[0] }).to.deep.eq({ ...object });
  });
});
