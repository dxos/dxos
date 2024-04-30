//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { afterTest, describe, test } from '@dxos/test';

import { EchoTestBuilder } from './echo-test-builder';

describe('Integration tests', () => {
  test('read/write to one database', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    afterTest(() => builder.close());

    const [spaceKey] = PublicKey.randomSequence();

    const peer = await builder.createPeer();

    // TODO(dmaretskyi): There must be a better way...
    const rootUrl = await peer.host.createSpaceRoot(spaceKey);
    const db = peer.client.constructDatabase({ spaceKey });
    await db.setSpaceRoot(rootUrl);
    await db.open();
    afterTest(() => db.close());

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const { objects } = await db.query({ type: 'task' }).run();
    expect(objects).to.deep.eq([object]);
  });

  test('2 clients', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    afterTest(() => builder.close());

    const [spaceKey] = PublicKey.randomSequence();

    const peer = await builder.createPeer();
    const db = peer.client.constructDatabase({ spaceKey });

    // TODO(dmaretskyi): There must be a better way...
    const rootUrl = await peer.host.createSpaceRoot(spaceKey);
    await db.setSpaceRoot(rootUrl);
    await db.open();
    afterTest(() => db.close());

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const client2 = await peer.createClient();
    const db2 = client2.constructDatabase({ spaceKey });
    await db2.setSpaceRoot(rootUrl);
    await db2.open();
    afterTest(() => db2.close());

    const { objects } = await db2.query({ type: 'task' }).run();
    expect(objects).to.have.length(1);
    expect({ ...objects[0] }).to.deep.eq({ ...object });
  });
});
