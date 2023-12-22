//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { TypedObject } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { type LocalClientServices } from '../services';
import { TestBuilder, performInvitation } from '../testing';

describe('Mesh Client tests', () => {
  test.only('Going offline and back online', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    // Initialize clients.
    let client1: Client, client2: Client;
    {
      client1 = new Client({ services: testBuilder.createLocal() });
      await client1.initialize();
      await client1.halo.createIdentity();
      afterTest(() => client1.destroy());

      client2 = new Client({ services: testBuilder.createLocal() });
      await client2.initialize();
      await client2.halo.createIdentity();
      afterTest(() => client2.destroy());
    }

    // Perform invitation.
    let space1: Space, space2: Space;
    {
      space1 = await client1.spaces.create();
      await space1.waitUntilReady();
      await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

      space2 = client2.spaces.get(space1.key)!;
      await space2.waitUntilReady();
    }

    // Check that mutation are syncing.
    let objId: string;
    {
      const value = 'something important';
      const obj = space1.db.add(new TypedObject({ value }));
      objId = obj.id;
      await space1.db.flush();

      const queried = new Trigger();
      space2.db.query({ id: obj.id }).subscribe(({ objects }) => {
        if (objects.length === 1) {
          expect(objects.length).to.equal(1);
          expect(objects[0].value).to.equal(value);
          queried.wake();
        }
      }, true);

      await queried.wait({ timeout: 1000 });
    }

    // First client goes offline.
    let topic: PublicKey;
    {
      topic = (client1.services as LocalClientServices).host!.context.networkManager.topics.at(-1)!;
      const disconnected = (client2.services as LocalClientServices)
        .host!.context.networkManager.getSwarm(topic)!
        .disconnected.waitForCount(1);

      await client1.mesh.updateConfig(ConnectionState.OFFLINE);
      await asyncTimeout(disconnected, 1000);
    }

    // Offline updates value.
    {
      const obj1 = space1.db.getObjectById(objId) as TypedObject;
      obj1!.first = 1;
      await space1.db.flush();

      const obj2 = space2.db.getObjectById(objId) as TypedObject;
      obj2!.second = 2;
      await space2.db.flush();
    }

    // First client goes back online.
    {
      const connected = (client2.services as LocalClientServices)
        .host!.context.networkManager.getSwarm(topic)!
        .connected.waitForCount(1);

      await client1.mesh.updateConfig(ConnectionState.ONLINE);
      await asyncTimeout(connected, 3000);
    }

    // Check that mutation are syncing.
    {
      const queried = new Trigger();
      space2.db.query({ id: objId }).subscribe(({ objects }) => {
        if (objects.length === 1 && objects[0].first === 1 && objects[0].second === 2) {
          queried.wake();
        }
      }, true);

      await queried.wait({ timeout: 3000 });
    }
  });
});
