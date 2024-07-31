//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { type Client } from '../client';
import { create, Expando, SpaceState } from '../echo';
import { createInitializedClientsWithContext, performInvitation, waitForSpace } from '../testing';

describe('Lazy Space Loading', () => {
  test('default space is open by default', async () => {
    const [client] = await createInitializedClients(1);
    await reload(client);
    const space = client.spaces.default;
    expect(space.state.get()).to.eq(SpaceState.SPACE_READY);
  });

  test('can access closed space information', async () => {
    const [client] = await createInitializedClients(1);
    const createdSpace = await client.spaces.create();
    await reload(client);
    const space = findClientSpace(client, createdSpace);
    expect(space.state.get()).to.eq(SpaceState.SPACE_CLOSED);
    expect(space.id).not.to.be.undefined;
    expect(space.key).not.to.be.undefined;
    expect(space.db).not.to.be.undefined;
    expect(space.isOpen).to.be.false;
    expect(space.members.get()).to.deep.eq([]);
    expect(space.invitations.get()).to.deep.eq([]);
  });

  test('db is not accessible before space gets explicitly opened', async () => {
    const [client] = await createInitializedClients(1);
    const createdSpace = await client.spaces.create();
    await reload(client);
    const space = findClientSpace(client, createdSpace);
    const actions = [
      () => space.properties,
      () => space.updateMemberRole({ memberKey: PublicKey.random(), newRole: 1 }),
      () => space.share(),
    ];
    actions.forEach((action) => expect(action).to.throw);
    await openAndWaitReady(space);
    actions.forEach((action) => expect(action).not.to.throw);
  });

  test('can invite peers after space is initialized', async () => {
    const [client1, client2] = await createInitializedClients(2);
    const createdSpace = await client1.spaces.create();
    await reload(client1);
    const space = findClientSpace(client1, createdSpace);
    await openAndWaitReady(space);
    await Promise.all(performInvitation({ host: space, guest: client2.spaces }));
    await waitForSpace(client2, space.key, { ready: true });
  });

  test('message posting is disable until space gets explicitly opened', async () => {
    const [client1, client2] = await createInitializedClients(2, { fastPresence: true });
    const createdSpace = await client1.spaces.create();
    const guestSpace = await inviteMember(createdSpace, client2);
    await reload(client1);

    const channel = 'messages';
    const space = findClientSpace(client1, createdSpace);
    let messageCount = 0;
    const messageReceived = new Trigger();
    space.listen(channel, () => {
      messageCount++;
      messageReceived.wake();
    });

    const connectionEstablished = new Trigger();
    space.members.subscribe((members) => {
      const client2State = members.find((m) => m.identity.identityKey.equals(client2.halo.identity.get()!.identityKey));
      if (client2State?.presence === SpaceMember.PresenceState.ONLINE) {
        connectionEstablished.wake();
      }
    });

    // Ignored message
    await guestSpace.postMessage(channel, {});

    await openAndWaitReady(space);
    await connectionEstablished.wait();
    messageReceived.reset();
    await guestSpace.postMessage(channel, { hello: '' });
    await messageReceived.wait();

    expect(messageCount).to.eq(1);
  });

  test('replication starts after space gets opened', async () => {
    const [host, guest] = await createInitializedClients(2, { fastPresence: true });
    const createdSpace = await host.spaces.create();
    const guestSpace = await inviteMember(createdSpace, guest);

    await reload(host);
    const guestObject = guestSpace.db.add(create(Expando, {}));

    const hostSpace = findClientSpace(host, createdSpace);
    await openAndWaitReady(hostSpace);
    await guestSpace.db.flush();

    await waitForExpect(() => {
      expect(hostSpace.db.getObjectById(guestObject.id)).not.to.be.undefined;
    });

    guestObject.content = 'foo';

    await waitForExpect(() => {
      expect(hostSpace.db.getObjectById(guestObject.id)?.content).to.eq(guestObject.content);
    });
  });

  const createInitializedClients = async (count: number, options?: { fastPresence: boolean }): Promise<Client[]> => {
    const context = new Context();
    afterTest(() => context.dispose());
    return createInitializedClientsWithContext(context, count, {
      config: new Config({ runtime: { client: { lazySpaceOpen: true } } }),
      serviceConfig: options?.fastPresence ? { fastPeerPresenceUpdate: true } : undefined,
      storage: true,
    });
  };

  const reload = async (client: Client) => {
    await client.spaces.isReady.wait();
    await client.destroy();
    log('restarted');
    await client.initialize();
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
  };
});

const inviteMember = async (space: Space, client: Client) => {
  await Promise.all(performInvitation({ host: space, guest: client.spaces }));
  return waitForSpace(client, space.key, { ready: true });
};

const findClientSpace = (client: Client, space: Space) => {
  return client.spaces.get().find((s) => s.id === space.id)!;
};

const openAndWaitReady = async (space: Space) => {
  await space.open();
  await space.waitUntilReady();
};
