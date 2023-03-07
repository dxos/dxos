//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { DocumentStack, Contact, Organization } from '@dxos/kai-types';
import { describe, test } from '@dxos/test';

import { loadJson } from '../util';
import { KaiBot } from './kai-bot';

describe('KaiBot', () => {
  test('basic', async () => {
    // TODO(burdon): Use Config util.
    const config = new Config(loadJson(process.env.TEST_CONFIG!));

    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    const space = await client.echo.createSpace();

    const bot = new KaiBot();
    await bot.init(client.config, space);

    {
      const trigger = new Trigger();
      await bot.start();

      const organization = await space.db.add(new Organization({ name: 'Blue Yard' }));
      const contact = await space.db.add(new Contact({ name: 'Chad Fowler', employer: organization }));
      const stack = await space.db.add(new DocumentStack({ title: contact.name, subjectId: contact.id }));

      console.log(JSON.stringify(stack, undefined, 2));
      console.log(contact.employer.name); // TODO(burdon): This isn't stringified above.

      const query = space.db.query(DocumentStack.filter());
      const subscription = query.subscribe(({ objects: stacks }) => {
        // TODO(burdon): Called twice!
        const document = stacks[0].sections[0];
        const text = document.content.text;
        expect(text.length).to.be.greaterThan(0);
        trigger.wake();
      });

      await trigger.wait();
      subscription();

      await bot.stop();
      console.log('!!!'); // TODO(burdon): Test gets here but doesn't exit!
    }
  });
});
