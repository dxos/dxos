import { afterTest, describe, test } from '@dxos/test';
import { EchoTestBuilder } from './echo-test-builder';
import { PublicKey } from '@dxos/keys';
import { expect } from 'chai';

describe('Integration tests', () => {
  test('read/write to one database', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    afterTest(() => builder.close());

    const [spaceKey] = PublicKey.randomSequence();

    const peer = await builder.createPeer();
    const db = peer.client.createDatabase({ spaceKey });
    await db.open();
    afterTest(() => db.close());

    // TODO(dmaretskyi): There must be a better way...
    const rootUrl = await peer.host.createSpaceRoot(spaceKey);
    await db.automerge.open({ rootUrl });

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const { objects } = await db.query({ type: 'task' }).run();
    expect(objects).to.have.length(1);
    expect(objects[0] === object).to.be.true;
    // TODO(dmaretskyi): `to.eq` doesn't work for some reason.
    // expect(objects).to.eq([object]);
  });
});
