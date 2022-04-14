//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Client, Party } from '@dxos/client';
import { PARTY_ITEM_TYPE } from '@dxos/echo-db';

// TODO(burdon): Move builder here.
// TODO(burdon): Used for stress testing.
// TODO(burdon): Used for SDK testing.

const createParty = async () => {
  const client = new Client();
  await client.initialize();
  expect(client.initialized).toBeTruthy();

  await client.halo.createProfile({ username: 'test-user' });
  const { username } = client.halo.profile!;
  expect(username).toEqual('test-user');

  const party = await client.echo.createParty();
  expect(party.isOpen).toBeTruthy();

  return { client, party }
};

const destroyParty = async (client: Client, party: Party) => {
  await party.destroy();
  // TODO(burdon): Party and Database doesn't match.
  //  party.destroy not called until ClientServiceProxy.
  // console.log(party.database.state);
  // expect(party.isActive).toBeFalsy();

  await client.destroy();
  expect(client.initialized).toBeFalsy();
}

const handler = async (f: (client: Client, Party: Party) => Promise<void>) => {
  const { client, party } = await createParty();
  try {
    await f(client, party);
  } finally {
    await destroyParty(client, party);
  }
};

describe('Schema', () => {
  test('Sanity.', async () => {
    const { client, party } = await createParty();
    await destroyParty(client, party);
  });

  test('Create items.', async () => handler(async (client, party) => {
    const count = 100;
    await Promise.all(Array.from({ length: count }).map(async () => {
      await party.database.createItem();
    }));

    // TODO(burdon): Exclude party.
    const { entities } = await party.database.select()
      .filter(({ type }) => type !== PARTY_ITEM_TYPE)
      .exec();

    expect(entities).toHaveLength(count);
  }))
});
