//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { getObjectCore } from './echo-handler';
import { EchoTestBuilder } from './testing';

describe('HyperGraph', () => {
  test('cross-space references', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    const peer = await builder.createPeer();

    const db1 = await peer.createDatabase(spaceKey1);
    const db2 = await peer.createDatabase(spaceKey2);

    const obj1 = db1.add(
      Obj.make(Type.Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = db2.add(
      Obj.make(Type.Expando, {
        type: 'task',
        title: 'B',
      }),
    );

    obj1.link = Ref.make(obj2);
    expect(obj1.link.target?.title).to.eq('B');

    await Promise.all([db1.flush(), db2.flush()]);
    expect(obj1.link.target?.title).to.eq('B');

    await db1.close();
    await db1.open();
    expect(obj1.link.target?.title).to.eq('B');
  });

  // TODO(mykola): Broken.
  test.skip('cross-space references get resolved on database load', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    const peer = await builder.createPeer();

    const db1 = await peer.createDatabase(spaceKey1);
    const db2 = await peer.createDatabase(spaceKey2);

    const obj1 = db1.add(
      Obj.make(Type.Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = db2.add(
      Obj.make(Type.Expando, {
        type: 'task',
        title: 'B',
      }),
    );
    obj1.link = Ref.make(obj2);
    await Promise.all([db1.flush(), db2.flush()]);
    expect(obj1.link.target?.title).to.eq('B');

    await db2.close();

    let called = false;
    getObjectCore(obj1).updates.on(() => {
      called = true;
    });

    await db2.open();
    expect(obj1.link.target?.title).to.eq('B');
    expect(called).to.eq(true);
  });
});
