//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { create, Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { describe, openAndClose, test } from '@dxos/test';

import { getObjectCore } from './core-db';
import { EchoTestBuilder } from './testing';

describe('HyperGraph', () => {
  test('cross-space query', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    const peer = await builder.createPeer();

    const db1 = await peer.createDatabase(spaceKey1);
    const db2 = await peer.createDatabase(spaceKey2);

    const obj1 = db1.add(
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = db2.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );
    const obj3 = db2.add(
      create(Expando, {
        type: 'record',
        title: 'C',
      }),
    );
    await Promise.all([db1.flush(), db2.flush()]);

    const query = peer.client.graph.query({ type: 'task' });
    expect((await query.run()).objects.map((obj) => obj.id)).to.deep.eq([obj1.id, obj2.id]);

    let updated = false;
    query.subscribe(() => {
      updated = true;
    });

    updated = false;
    obj1.completed = true;
    await db1.flush();
    expect(updated).to.eq(true);

    updated = false;
    obj2.completed = true;
    await db2.flush();
    expect(updated).to.eq(true);

    updated = false;
    db2.remove(obj2);
    await db2.flush();
    expect(updated).to.eq(true);
    expect(query.objects.map((obj) => obj.id)).to.deep.eq([obj1.id]);

    updated = false;
    obj3.type = 'task';
    await db2.flush();
    expect(updated).to.eq(true);
    expect(query.objects.map((obj) => obj.id)).to.deep.eq([obj1.id, obj3.id]);
  });

  test('cross-space references', async () => {
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();
    const peer = await builder.createPeer();

    const db1 = await peer.createDatabase(spaceKey1);
    const db2 = await peer.createDatabase(spaceKey2);

    const obj1 = db1.add(
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = db2.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );

    obj1.link = obj2;
    expect(obj1.link.title).to.eq('B');

    await Promise.all([db1.flush(), db2.flush()]);
    expect(obj1.link.title).to.eq('B');

    await db1.close();
    await db1.open();
    expect(obj1.link.title).to.eq('B');
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
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = db2.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );
    obj1.link = obj2;
    await Promise.all([db1.flush(), db2.flush()]);
    expect(obj1.link.title).to.eq('B');

    await db2.close();

    let called = false;
    getObjectCore(obj1).updates.on(() => {
      called = true;
    });

    await db2.open();
    expect(obj1.link.title).to.eq('B');
    expect(called).to.eq(true);
  });
});
