//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import fs from 'fs';
import yaml from 'js-yaml';

import { truncate, truncateKey } from '@dxos/debug';

import { buildTestParty, PartyBuilder, TestType } from './builders/index.js';
import { treeLogger, TreeRoot } from './logging/index.js';
import { Builder, handler } from './testing/index.js';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

type DataType = {
  [TestType.Org]: {
    id: string
    type?: string
    name?: string
  }[]

  [TestType.Person]: {
    id: string
    type?: string
    org?: string
    name?: string
  }[]
}

const logKey = (id: string) => truncateKey(id, 4);
const logString = (value?: string) => truncate(value, 24, true);

describe('Builders', function () {
  it('Sanity.', async function () {
    const builder = new Builder();
    await builder.initialize();
    const party = await builder.createParty();
    await builder.destroyParty(party);
  });

  it('Tree logger.', function () {
    return handler(async (client, party) => {
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
    });
  });

  it('Import/export.', async function () {
    const dir = `/tmp/dxos/testing/${Date.now()}`;
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
        [TestType.Org]: orgs.map(item => ({
          id: item.id,
          type: item.type,
          name: item.model.get('name')
        })),

        [TestType.Person]: people.map(item => ({
          id: item.id,
          type: item.type,
          name: item.model.get('name'),
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
      for (const org of data[TestType.Org]) {
        const item = await party.database.createItem({
          type: org.type,
          props: {
            name: org.name
          }
        });

        orgs.set(org.id, item.id);
      }

      for (const person of data[TestType.Person]) {
        await party.database.createItem({
          type: person.type,
          parent: orgs.get(person.org),
          props: {
            name: person.name
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
          id: chalk.blue(logKey(item.id)),
          type: chalk.magenta(logString(item.type)),
          name: chalk.green(logString(item.model.get('name')))
        })), {
          columns: ['id', 'type', 'name']
        });

        log('\n' + rows + '\n');
      }

      {
        const { entities } = await party.database.select()
          .filter(({ type }) => type === TestType.Person)
          .exec();

        // Log table.
        const rows = columnify(entities.map(item => ({
          id: chalk.blue(logKey(item.id)),
          type: chalk.magenta(logString(item.type)),
          name: chalk.green(logString(item.model.get('name'))),
          org: chalk.red(logString(item.parent?.model.get('name')))
        })), {
          columns: ['id', 'type', 'name', 'org']
        });

        log('\n' + rows + '\n');
      }

      await builder.destroyParty(party);
    }
  });
});
