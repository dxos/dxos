//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { getAutomergeObjectCore } from './automerge';
import { create, Expando } from './ddl';
import { TestBuilder } from './testing';

describe('HyperGraph', () => {
  test('cross-space query', async () => {
    const builder = new TestBuilder();
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();

    const space1 = await builder.createPeer(spaceKey1);
    const space2 = await builder.createPeer(spaceKey2);

    const obj1 = space1.db.add(
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = space2.db.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );
    const obj3 = space2.db.add(
      create(Expando, {
        type: 'record',
        title: 'C',
      }),
    );
    await builder.flushAll();

    const query = builder.graph.query({ type: 'task' });
    expect((await query.run()).objects.map((obj) => obj.id)).to.deep.eq([obj1.id, obj2.id]);

    let updated = false;
    query.subscribe(() => {
      updated = true;
    });

    updated = false;
    obj1.completed = true;
    await space1.flush();
    expect(updated).to.eq(true);

    updated = false;
    obj2.completed = true;
    await space2.flush();
    expect(updated).to.eq(true);

    updated = false;
    space2.db.remove(obj2);
    await space2.flush();
    expect(updated).to.eq(true);
    expect(query.objects.map((obj) => obj.id)).to.deep.eq([obj1.id]);

    updated = false;
    obj3.type = 'task';
    await space2.flush();
    expect(updated).to.eq(true);
    expect(query.objects.map((obj) => obj.id)).to.deep.eq([obj1.id, obj3.id]);
  });

  test('cross-space references', async () => {
    const builder = new TestBuilder();
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();

    const space1 = await builder.createPeer(spaceKey1);
    const space2 = await builder.createPeer(spaceKey2);

    const obj1 = space1.db.add(
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = space2.db.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );

    obj1.link = obj2;
    expect(obj1.link.title).to.eq('B');

    await builder.flushAll();
    expect(obj1.link.title).to.eq('B');

    await space1.reload();
    expect(obj1.link.title).to.eq('B');
  });

  test('cross-space references get resolved on database load', async () => {
    const builder = new TestBuilder();
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();

    const space1 = await builder.createPeer(spaceKey1);
    const space2 = await builder.createPeer(spaceKey2);

    const obj1 = space1.db.add(
      create(Expando, {
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = space2.db.add(
      create(Expando, {
        type: 'task',
        title: 'B',
      }),
    );
    obj1.link = obj2;
    await builder.flushAll();
    expect(obj1.link.title).to.eq('B');

    await space2.unload();
    expect(obj1.link).to.eq(undefined);

    let called = false;
    getAutomergeObjectCore(obj1).updates.on(() => {
      called = true;
    });

    await space2.reload();
    expect(obj1.link.title).to.eq('B');
    expect(called).to.eq(true);
  });
});
