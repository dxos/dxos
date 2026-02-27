//
// Copyright 2021 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { toPublicKey, encodePublicKey } from '@dxos/protocols/buf';
import { SpaceMember_PresenceState } from '@dxos/protocols/buf/dxos/client/services_pb';

import { type Client } from '../client';
import { SpaceState } from '../echo';
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
      () => space.updateMemberRole({ memberKey: encodePublicKey(PublicKey.random()), newRole: 1 } as never),
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
    await Promise.all(performInvitation({ host: space as never, guest: client2.spaces as never }));
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
    const client2IdentityKey = client2.halo.identity.get()?.identityKey;
    space.members.subscribe((members) => {
      const client2State = members.find(
        (m) =>
          m.identity?.identityKey &&
          client2IdentityKey &&
          toPublicKey(m.identity.identityKey).equals(toPublicKey(client2IdentityKey)),
      );
      if (client2State?.presence === SpaceMember_PresenceState.ONLINE) {
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
    await Promise.all([host, guest].map((c) => c.addTypes([TestSchema.Expando])));
    const createdSpace = await host.spaces.create();
    const guestSpace = await inviteMember(createdSpace, guest);

    await reload(host);
    const guestObject = guestSpace.db.add(Obj.make(TestSchema.Expando, {}));

    const hostSpace = findClientSpace(host, createdSpace);
    await openAndWaitReady(hostSpace);
    await guestSpace.db.flush();

    await expect.poll(() => hostSpace.db.getObjectById(guestObject.id)).not.toEqual(undefined);

    Obj.change(guestObject, (o) => {
      o.content = 'foo';
    });

    await expect.poll(() => hostSpace.db.getObjectById(guestObject.id)?.content).toEqual(guestObject.content);
  });

  const createInitializedClients = async (count: number, options?: { fastPresence: boolean }): Promise<Client[]> => {
    const context = new Context();
    onTestFinished(async () => {
      await context.dispose();
    });
    return createInitializedClientsWithContext(context, count, {
      config: new Config({ runtime: { client: { lazySpaceOpen: true } } }),
      serviceConfig: options?.fastPresence ? { fastPeerPresenceUpdate: true } : undefined,
      storage: true,
    });
  };

  const reload = async (client: Client) => {
    await client.spaces.waitUntilReady();
    await client.destroy();
    log('restarted');
    await client.initialize();
    await client.spaces.waitUntilReady();
    await client.spaces.default.waitUntilReady();
  };
});

const inviteMember = async (space: Space, client: Client) => {
  await Promise.all(performInvitation({ host: space as never, guest: client.spaces as never }));
  return waitForSpace(client, space.key, { ready: true });
};

const findClientSpace = (client: Client, space: Space) => {
  return client.spaces.get().find((s) => s.id === space.id)!;
};

const openAndWaitReady = async (space: Space) => {
  await space.open();
  await space.waitUntilReady();
};
