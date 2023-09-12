//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Document } from '@braneframe/types';
import { Trigger } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { fromHost } from '@dxos/client/services';
import { Contact, DocumentStack, Organization } from '@dxos/kai-types';
import { describe, test } from '@dxos/test';

import { KaiBot } from './kai-bot';
import { loadJson } from '../util';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('KaiBot', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const config = new Config(loadJson(process.env.TEST_CONFIG!));
    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const bot = new KaiBot('dxos.module.bot.kai');
    await bot.init(client.config, space);
    await bot.start();

    {
      const trigger = new Trigger();
      const query = space.db.query(DocumentStack.filter());
      const unsubscribe = query.subscribe(({ objects: stacks }) => {
        expect(stacks).to.have.length(1);

        const { object } = stacks[0].sections[0];
        expect(object.__typename).to.equal('dxos.experimental.kai.Document');
        expect(object instanceof Document).to.be.true;

        const text = object.content.text;
        expect(text.length).to.be.greaterThan(0);
        trigger.wake();
      });

      {
        const organization = await space.db.add(new Organization({ name: 'backed.vc' }));
        const contact = await space.db.add(new Contact({ name: 'alex brunicki', employer: organization }));
        await space.db.add(new DocumentStack({ title: contact.name, subjectId: contact.id }));
      }

      await trigger.wait();
      unsubscribe();
    }

    await bot.stop();
  });
});
