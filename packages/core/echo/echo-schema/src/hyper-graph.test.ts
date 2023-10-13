//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { TestBuilder } from './testing';
import { Expando } from './typed-object';

describe('HyperGraph', () => {
  test('cross-space query', async () => {
    const builder = new TestBuilder();
    const [spaceKey1, spaceKey2] = PublicKey.randomSequence();

    const space1 = await builder.createPeer(spaceKey1);
    const space2 = await builder.createPeer(spaceKey2);

    const obj1 = space1.db.add(
      new Expando({
        type: 'task',
        title: 'A',
      }),
    );
    const obj2 = space2.db.add(
      new Expando({
        type: 'task',
        title: 'B',
      }),
    );
    const obj3 = space2.db.add(
      new Expando({
        type: 'record',
        title: 'C',
      }),
    );
    await builder.flushAll();

    const query = builder.graph.query({ type: 'task' });
    expect(query.objects.map((obj) => obj.id)).to.deep.eq([obj1.id, obj2.id]);

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
});
