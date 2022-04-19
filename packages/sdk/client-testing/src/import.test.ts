//
// Copyright 2020 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import { it as test } from 'mocha';

import { buildTestParty, PartyBuilder, TestType } from './builders';
import { treeLogger, TreeRoot } from './logging';
import { Builder } from './testing';

// TODO(burdon): Use debug for logging.

type DataType = {
  org: {
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

describe('Import/export', async () => {
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
      console.log(`Output: ${filename}`);

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

      await builder.destroyParty(party);

      {
        const { entities } = await party.database.select()
          .filter(({ type }) => type === TestType.Org)
          .exec();

        const output = treeLogger(new TreeRoot(party.key.toHex(), entities));
        console.log(output, '\n');
      }
    }
  });
});
