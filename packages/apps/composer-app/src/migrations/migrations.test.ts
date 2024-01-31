//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Folder } from '@braneframe/types';
import { Client, PublicKey } from '@dxos/client';
import { type Space, Expando } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { migrations } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(migrations[0].version.toString(), async () => {
    const query = space.db.query(Folder.filter());
    expect(query.objects).to.have.lengthOf(0);

    await migrations[0].up({ space });
    expect(query.objects).to.have.lengthOf(1);
    expect(query.objects[0].name).to.equal(space.key.toHex());
    expect(space.properties[Folder.schema.typename]).to.equal(query.objects[0]);
  });

  test(migrations[1].version.toString(), async () => {
    const folder1 = space.db.add(new Folder({ name: space.key.toHex() }));
    const folder2 = space.db.add(new Folder({ name: space.key.toHex() }));
    const folder3 = space.db.add(new Folder({ name: space.key.toHex() }));
    space.properties[Folder.schema.typename] = folder3;

    const keys = [...Array(9)].map(() => PublicKey.random().toHex());
    folder1.objects = keys.slice(0, 3).map((key) => new Expando({ key }));
    folder2.objects = keys.slice(3, 6).map((key) => new Expando({ key }));
    folder3.objects = keys.slice(6, 9).map((key) => new Expando({ key }));

    const query = space.db.query(Folder.filter());
    expect(query.objects).to.have.lengthOf(3);
    expect(query.objects[0].name).to.equal(space.key.toHex());
    expect(query.objects[0].objects).to.have.lengthOf(3);

    await migrations[1].up({ space });
    expect(query.objects).to.have.lengthOf(1);
    expect(query.objects[0].name).to.equal('');
    expect(query.objects[0].objects).to.have.lengthOf(9);
    expect(space.properties[Folder.schema.typename]).to.equal(query.objects[0]);
  });
});
