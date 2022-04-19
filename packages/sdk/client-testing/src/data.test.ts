//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import fs from 'fs';
import yaml from 'js-yaml';
import { it as test } from 'mocha';

import { buildTestParty, PartyBuilder, TestType } from './builders';
import { treeLogger, TreeRoot } from './logging';
import { Builder, handler } from './testing';

import { truncate, truncateKey } from '@dxos/debug';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

type DataType = {
  org: { // TODO(burdon): Use TestType.
    id: string
    type?: string
    title?: string
  }[],

  person: {
    id: string
    type?: string
    org?: string
    title?: string
  }[]
}

describe('Builders', async () => {
  test('Sanity.', async () => {
    const builder = new Builder();
    await builder.initialize();
    const party = await builder.createParty();
    await builder.destroyParty(party);
  });

  test('Tree logger.', () => handler(async (client, party) => {
    await buildTestParty(new PartyBuilder(party));

    const { entities } = await party.database.select()
      .filter(({ type }) => type === TestType.Org)
      .exec();

    {
      log('Party:', party.key.toHex());
      const output = treeLogger(new TreeRoot(party.key.toHex(), entities));
      log(output, '\n');
    }

    {
      log('Item:', entities[0].id);
      const output = treeLogger(entities[0]);
      log(output, '\n');
    }
  }));

  test('Import/export.', async () => {
    const dir = `/tmp/dxos/testing/${Date.now()}`
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${dir}/data.yml`;

    {
      const builder = new Builder();
      await builder.initialize();
      const party = await builder.createParty();
      await buildTestParty(new PartyBuilder(party), {
        numOrgs: 3,
        numPeople: 5
      });

      const { entities: orgs } = await party.database.select()
        .filter(({ type }) => type === TestType.Org)
        .exec();

      const { entities: people } = await party.database.select()
        .filter(({ type }) => type === TestType.Person)
        .exec();

      const data: DataType = {
        org: orgs.map(item => ({
          id: item.id,
          type: item.type,
          title: item.model.get('title')
        })),

        person: people.map(item => ({
          id: item.id,
          type: item.type,
          title: item.model.get('title'),
          org: item.parent!.id
        }))
      };

      const text = yaml.dump(data, { sortKeys: true });
      fs.writeFileSync(filename, text);
      log(`Output: ${filename}`);

      await builder.destroyParty(party);
    }

    {
      const builder = new Builder();
      await builder.initialize();
      const party = await builder.createParty();

      const raw = fs.readFileSync(filename, 'utf8');
      const data: DataType = yaml.load(raw) as DataType;

      const orgs = new Map();
      for (const org of data.org) {
        const item = await party.database.createItem({
          type: org.type,
          props: {
            title: org.title
          }
        });

        orgs.set(org.id, item.id);
      }

      for (const person of data.person) {
        await party.database.createItem({
          type: person.type,
          parent: orgs.get(person.org),
          props: {
            title: person.title
          }
        });
      }

      {
        const { entities } = await party.database.select()
          .filter(({ type }) => type === TestType.Org)
          .exec();

        // Log tree.
        const output = treeLogger(new TreeRoot(party.key.toHex(), entities));
        log(output, '\n');

        // Log table.
        const rows = columnify(entities.map(item => ({
          id: chalk.blue(truncateKey(item.id, 4)),
          type: chalk.magenta(truncate(item.type, 24, true)),
          title: chalk.green(truncate(item.model.get('title'), 32, true))
        })), {
          columns: ['id', 'type', 'title']
        });

        log('\n' + rows + '\n');
      }

      {
        const { entities } = await party.database.select()
          .filter(({ type }) => type === TestType.Person)
          .exec();

        // Log table.
        const rows = columnify(entities.map(item => ({
          id: chalk.blue(truncateKey(item.id, 4)),
          type: chalk.magenta(truncate(item.type, 24, true)),
          title: chalk.green(truncate(item.model.get('title'), 32, true)),
          org: chalk.red(item.parent?.model.get('title'))
        })), {
          columns: ['id', 'type', 'title', 'org']
        });

        log('\n' + rows + '\n');
      }

      await builder.destroyParty(party);
    }
  });
});
