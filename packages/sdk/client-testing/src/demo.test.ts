//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import { it as test } from 'mocha';

import { truncate, truncateKey } from '@dxos/debug';
import { PARTY_ITEM_TYPE } from '@dxos/echo-db';

import { buildTestParty, PartyBuilder, TestType } from './builders';
import { treeLogger, TreeRoot } from './logging';
import { Builder, handler } from './testing';

describe('Schema', () => {
  test('Sanity.', async () => {
    const builder = new Builder();
    await builder.initialize();
    const party = await builder.createParty();
    await builder.destroyParty(party);
  });

  test('Log tree.', async () => handler(async (client, party) => {
    await buildTestParty(new PartyBuilder(party), {
      numOrgs: 3
    });

    const { entities } = await party.database.select()
      // TODO(burdon): Exclude party (and other system types) by default.
      .filter(({ type }) => type !== PARTY_ITEM_TYPE)
      .filter(({ type }) => type === TestType.Org)
      .exec();

    const json = entities.map(item => ({
      id: item.id,
      type: item.type,
      title: item.model.get('title')
    }));

    {
      const rows = columnify(entities.map(item => ({
        id: chalk.blue(truncateKey(item.id, 4)),
        type: chalk.magenta(item.type),
        title: chalk.green(truncate(item.model.get('title'), 32))
      })), {
        columns: ['id', 'type', 'title']
      });

      console.log('\n' + rows + '\n');
    }

    {
      const output = treeLogger(new TreeRoot(party.key.toHex(), entities));
      console.log(output, '\n');
    }

    {
      const output = treeLogger(entities[0]);
      console.log(output, '\n');
    }
  }));
});
