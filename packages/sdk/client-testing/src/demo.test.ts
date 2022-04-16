//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { Client, Party } from '@dxos/client';
import { truncate, truncateKey } from '@dxos/debug';
import { PARTY_ITEM_TYPE } from '@dxos/echo-db';

import { TestType } from './builders';

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

  return { client, party };
};

const destroyParty = async (client: Client, party: Party) => {
  await party.destroy();
  // TODO(burdon): Party and Database doesn't match.
  //  party.destroy not called until ClientServiceProxy.
  // console.log(party.database.state);
  // expect(party.isActive).toBeFalsy();

  await client.destroy();
  expect(client.initialized).toBeFalsy();
};

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
    const count = 16;
    await Promise.all(Array.from({ length: count }).map(async () => {
      await party.database.createItem({
        type: faker.random.arrayElement([TestType.Org, TestType.Project, TestType.Person, TestType.Task]),
        props: {
          title: faker.lorem.sentence()
        }
      });
    }));

    const { entities } = await party.database.select()
      // TODO(burdon): Exclude party (and other system types) by default.
      .filter(({ type }) => type !== PARTY_ITEM_TYPE)
      .exec();

    expect(entities).toHaveLength(count);

    const rows = columnify(entities.map(item => ({
      id: chalk.blue(truncateKey(item.id, 8)),
      type: chalk.magenta(item.type),
      title: chalk.green(truncate(item.model.get('title'), 32))
    })), {
      columns: ['id', 'type', 'title']
    });

    console.log(rows);

    // TODO(burdon): Tree view util.
    // https://waylonwalker.com/drawing-ascii-boxes/#connectors
    console.log('X ╍─┬───╍ A');
    console.log('    ├─┬─╍ B');
    console.log('    │ ╰─╍ C');
    console.log('    ╰───╍ D');
  }));
});
