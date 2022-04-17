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

import { TreeRoot, treeLogger } from './logging';

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
    const count = 8;

    // TODO(burdon): Use builder.
    faker.seed(100);
    await Promise.all(Array.from({ length: count }).map(async () => {
      const item = await party.database.createItem({
        type: TestType.Org,
        props: {
          title: faker.lorem.sentence()
        }
      });

      await Promise.all(Array.from({ length: faker.datatype.number({ min: 0, max: 3 }) }).map(async () => {
        const project = await party.database.createItem({
          type: TestType.Project,
          parent: item.id,
          props: {
            title: faker.lorem.sentence()
          }
        });

        await Promise.all(Array.from({ length: faker.datatype.number({ min: 0, max: 5 }) }).map(async () => {
          return await party.database.createItem({
            type: TestType.Task,
            parent: project.id,
            props: {
              title: faker.lorem.sentence()
            }
          });
        }));

        return project;
      }));
    }));

    const { entities } = await party.database.select()
      // TODO(burdon): Exclude party (and other system types) by default.
      .filter(({ type }) => type !== PARTY_ITEM_TYPE)
      .filter(({ parent }) => !parent)
      .exec();

    expect(entities).toHaveLength(count);

    const rows = columnify(entities.map(item => ({
      id: chalk.blue(truncateKey(item.id, 4)),
      type: chalk.magenta(item.type),
      title: chalk.green(truncate(item.model.get('title'), 32))
    })), {
      columns: ['id', 'type', 'title']
    });

    console.log();
    console.log(rows);
    console.log();

    // TODO(burdon): Use logUpdate to show changing in real time (in CLI).
    const output = treeLogger([], new TreeRoot(party.key.toHex(), entities));
    console.log(output);
  }));
});
