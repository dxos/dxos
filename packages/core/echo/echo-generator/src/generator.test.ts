//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client, type PublicKey } from '@dxos/client';
import { type GossipMessage } from '@dxos/client/mesh';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { afterTest, describe, test } from '@dxos/test';

import { createSpaceObjectGenerator, createTestObjectGenerator } from './data';

faker.seed(3);

describe('TestObjectGenerator', () => {
  test('basic', () => {
    const generator = createTestObjectGenerator();

    // Create raw object.
    const object = generator.createObject({ types: ['person'] });
    expect(object).to.exist;
  });

  test('with space', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const generator = createSpaceObjectGenerator(space);

    // Add schemas.
    generator.addSchemas();

    // Create org object.
    const organization = generator.createObject({ types: ['organization'] });
    expect(organization.__schema).to.exist;

    // Expect at least one person object with a linked org reference.
    const objects = generator.createObjects({ types: ['person'], count: 10 });
    expect(objects.some((object) => object.org === organization)).to.be.true;

    await client.destroy();
  });

  test('replication test', async () => {
    const builder = new TestBuilder();
    const channel = 'dxos.org/generator/test/channel';

    let client1: Client;
    {
      // Init client1.
      const services = builder.createLocal();
      client1 = new Client({ services });
      await client1.initialize();
      afterTest(() => client1.destroy());
      await client1.halo.createIdentity({ displayName: 'user1' });
    }

    let spaceKey: PublicKey;
    const messageReceived = new Trigger<GossipMessage>();
    {
      // Create space.
      const space = await client1.spaces.create({ name: 'first space' });
      await space.waitUntilReady();
      spaceKey = space.key;
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      generator.createObject({ types: ['organization'] });
      generator.createObjects({ types: ['person'], count: 10 });
      await space.db.flush();

      // Listen for messages.
      const unsub = space.listen(channel, (message) => {
        messageReceived.wake(message);
      });
      afterTest(() => unsub());
    }

    let client2: Client;
    {
      // Init client2.
      const services = builder.createLocal();
      client2 = new Client({ services });
      await client2.initialize();
      afterTest(() => client2.destroy());
    }

    {
      // Invitation.
      await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);
    }

    {
      // Wait for data replication.
      await asyncTimeout(client2.spaces.isReady.wait(), 1000);
      const space = client2.spaces.get(spaceKey)!;
      await space.waitUntilReady();
      const query = space.db.query();
      const trigger = new Trigger();
      query.subscribe(({ objects }) => {
        if (objects.length >= 11) {
          trigger.wake();
        }
      });
      await asyncTimeout(trigger.wait(), 2000);

      // Send message.
      await space.postMessage(channel, { text: 'hello' });
      await asyncTimeout(messageReceived.wait(), 2000);
    }
  });
});
