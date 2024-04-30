//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { EchoTestBuilder } from './echo-test-builder';
import { async } from 'effect/Stream';
import { EchoReactiveObject } from '@dxos/echo-schema';

describe.only('Integration tests', () => {
  test('read/write to one database', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    const { objects } = await db.query().run();
    expect(objects).to.deep.eq([object]);
  });

  test.skip('reopen peer', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();

    let object: EchoReactiveObject<any>;
    let rootUrl: string;
    {
      await using db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl!;

      object = db.add({ type: 'task', title: 'A' });
      await db.flush();
    }

    await peer.close();
    await peer.open();

    {
      await using db = await peer.openDatabase(spaceKey, rootUrl);

      const { objects } = await db.query().run();
      expect(objects).to.have.length(1);
      expect({ ...objects[0] }).to.deep.eq({ ...object });
    }
  });

  test.skip('reload peer', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer();

    let object: EchoReactiveObject<any>;
    let rootUrl: string;
    {
      await using db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl!;

      object = db.add({ type: 'task', title: 'A' });
      await db.flush();
    }

    await peer.reload();

    {
      await using db = await peer.openDatabase(spaceKey, rootUrl);

      const { objects } = await db.query().run();
      expect(objects).to.have.length(1);
      expect({ ...objects[0] }).to.deep.eq({ ...object });
    }
  });

  test('2 clients', async () => {
    await using builder = await new EchoTestBuilder().open();
    const [spaceKey] = PublicKey.randomSequence();

    await using peer = await builder.createPeer();
    await using db = await peer.createDatabase(spaceKey);

    const object = db.add({ type: 'task', title: 'A' });
    await db.flush();

    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db.rootUrl!, { client: client2 });

    const { objects } = await db2.query().run();
    expect(objects).to.have.length(1);
    expect({ ...objects[0] }).to.deep.eq({ ...object });
  });
});
