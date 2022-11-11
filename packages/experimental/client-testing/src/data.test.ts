//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';
import columnify from 'columnify';
import debug from 'debug';
import fs from 'fs';
import yaml from 'js-yaml';

import { truncate, truncateKey } from '@dxos/debug';

import { buildTestSpace, SpaceBuilder, TestType } from './builders';
import { treeLogger, TreeRoot } from './logging';
import { TestBuilder, testCallback } from './testing';

const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

type DataType = {
  [TestType.Org]: {
    id: string;
    type?: string;
    name?: string;
  }[];

  [TestType.Person]: {
    id: string;
    type?: string;
    org?: string;
    name?: string;
  }[];
};

const logKey = (id: string) => truncateKey(id, 4);
const logString = (value?: string) => truncate(value, 24, true);

describe.only('Builders', function () {
  it.only('sanity', async function () {
    const builder = new TestBuilder();
    await builder.initialize();
    const space = await builder.createSpace();
    await builder.destroySpace(space);
  });

  it('tree logger', function () {
    return testCallback(async (client, space) => {
      await buildTestSpace(new SpaceBuilder(space));

      const { entities } = await space.database
        .select()
        .filter(({ type }) => type === TestType.Org)
        .exec();

      {
        log('Space:', space.key.toHex());
        const output = treeLogger(new TreeRoot(space.key.toHex(), entities));
        log(output, '\n');
      }

      {
        log('Item:', entities[0].id);
        const output = treeLogger(entities[0]);
        log(output, '\n');
      }
    });
  });

  it('import/export', async function () {
    const dir = `/tmp/dxos/testing/${Date.now()}`;
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${dir}/data.yml`;

    {
      const builder = new TestBuilder();
      await builder.initialize();
      const space = await builder.createSpace();
      await buildTestSpace(new SpaceBuilder(space), {
        numOrgs: 3,
        numPeople: 5
      });

      const { entities: orgs } = await space.database
        .select()
        .filter(({ type }) => type === TestType.Org)
        .exec();

      const { entities: people } = await space.database
        .select()
        .filter(({ type }) => type === TestType.Person)
        .exec();

      const data: DataType = {
        [TestType.Org]: orgs.map((item) => ({
          id: item.id,
          type: item.type,
          name: item.model.get('name')
        })),

        [TestType.Person]: people.map((item) => ({
          id: item.id,
          type: item.type,
          name: item.model.get('name'),
          org: item.parent!.id
        }))
      };

      const text = yaml.dump(data, { sortKeys: true });
      fs.writeFileSync(filename, text);
      log(`Output: ${filename}`);

      await builder.destroySpace(space);
    }

    {
      const builder = new TestBuilder();
      await builder.initialize();
      const space = await builder.createSpace();

      const raw = fs.readFileSync(filename, 'utf8');
      const data: DataType = yaml.load(raw) as DataType;

      const orgs = new Map();
      for (const org of data[TestType.Org]) {
        const item = await space.database.createItem({
          type: org.type,
          props: {
            name: org.name
          }
        });

        orgs.set(org.id, item.id);
      }

      for (const person of data[TestType.Person]) {
        await space.database.createItem({
          type: person.type,
          parent: orgs.get(person.org),
          props: {
            name: person.name
          }
        });
      }

      {
        const { entities } = await space.database
          .select()
          .filter(({ type }) => type === TestType.Org)
          .exec();

        // Log tree.
        const output = treeLogger(new TreeRoot(space.key.toHex(), entities));
        log(output, '\n');

        // Log table.
        const rows = columnify(
          entities.map((item) => ({
            id: chalk.blue(logKey(item.id)),
            type: chalk.magenta(logString(item.type)),
            name: chalk.green(logString(item.model.get('name')))
          })),
          {
            columns: ['id', 'type', 'name']
          }
        );

        log('\n' + rows + '\n');
      }

      {
        const { entities } = await space.database
          .select()
          .filter(({ type }) => type === TestType.Person)
          .exec();

        // Log table.
        const rows = columnify(
          entities.map((item) => ({
            id: chalk.blue(logKey(item.id)),
            type: chalk.magenta(logString(item.type)),
            name: chalk.green(logString(item.model.get('name'))),
            org: chalk.red(logString(item.parent?.model.get('name')))
          })),
          {
            columns: ['id', 'type', 'name', 'org']
          }
        );

        log('\n' + rows + '\n');
      }

      await builder.destroySpace(space);
    }
  });
});
