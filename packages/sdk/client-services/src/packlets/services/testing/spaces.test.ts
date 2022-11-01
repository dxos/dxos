//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncChain, latch, sleep, TimeoutError, Trigger } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { ObjectModel } from '@dxos/object-model';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { afterTest } from '@dxos/testutils';
import { ServiceContext } from 'packages/sdk/client-services/src/packlets/services/service-context';

import { createServiceContext } from './testing';

// TODO(burdon): Create test builder.
const createPeers = async (numPeers: number) => {
  const signalContext = new MemorySignalManagerContext();

  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = await createServiceContext({ signalContext });
      await peer.open();
      return peer;
    })
  );
};

const createIdentity = async (peer: ServiceContext) => {
  await peer.createIdentity();
  return peer;
};

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

// TODO(burdon): Factor out and make configurable (multiple items).
const sync = async (space1: Space, space2: Space) => {
  const type = 'test';

  {
    // Check item replicated from 1 => 2.
    const item1 = await space1.database!.createItem({ type });
    const item2 = await space2.database!.waitForItem({ type });
    expect(item1.id).to.eq(item2.id);
  }

  {
    // Check item replicated from 2 => 1.
    const item1 = await space2.database!.createItem({ type });
    const item2 = await space1.database!.waitForItem({ type });
    expect(item1.id).to.eq(item2.id);
  }
};

describe.only('services/spaces', function () {
  it('genesis', async function () {
    const peer = await createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    await peer.createIdentity();

    const space = await peer.spaceManager!.createSpace();
    expect(space.database).not.to.be.undefined;
    expect(peer.spaceManager!.spaces.has(space.key)).to.be.true;
    await space.close();
  });

  it('genesis with database mutations', async function () {
    const peer = await createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    await peer.createIdentity();
    const space = await peer.spaceManager!.createSpace();

    {
      const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
      void item.model.set('name', 'test');
    }

    {
      const [item] = space.database!.select({ type: 'test' }).exec().entities;
      expect(item.model.get('name')).to.eq('test');
    }

    await space.close();
  });

  // TODO(burdon): Test error during invitation.
  // TODO(burdon): Integrate observable with service API.
  // TODO(burdon): Integrate observable with client API.
  // TODO(burdon): Separate test file for invitations.
  // TODO(burdon): Copy pattern to halo.
  it('creates and accepts invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const complete1 = new Trigger<Space>();
    const complete2 = new Trigger<Space>();

    const space1 = await peer1.spaceManager!.createSpace();
    const observable1 = peer1.createInvitation(space1.key);
    observable1.subscribe({
      onConnect: async (invitation: InvitationDescriptor) => {
        const observable2 = peer2.acceptInvitation(invitation);
        observable2.subscribe({
          onConnect: async (invitation: InvitationDescriptor) => {},
          onSuccess: (space2: Space) => {
            complete2.wake(space2);
          },
          onCancel: () => {
            throw new Error();
          },
          onTimeout: (err) => {
            throw err;
          },
          onError: (err) => {
            throw err;
          }
        });
      },
      onSuccess: () => {
        complete1.wake(space1);
      },
      onCancel: () => {
        // TODO(burdon): Change observable API to throw error by default?
        throw new Error();
      },
      onTimeout: (err) => {
        throw err;
      },
      onError: (err) => {
        throw err;
      }
    });

    {
      const [space1, space2] = await Promise.all([complete1.wait(), complete2.wait()]);
      expect(space1.key).to.deep.eq(space2.key);

      await sync(space1, space2);

      await space1.close();
      await space2.close();
    }
  });

  it('cancels invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const cancelled = new Trigger();
    const connected1 = new Trigger<InvitationDescriptor>(); // peer 1 connected.
    const connected2 = new Trigger<InvitationDescriptor>(); // peer 2 connected.

    const space1 = await peer1.spaceManager!.createSpace();
    const observable1 = await peer1.createInvitation(space1.key);
    observable1.subscribe({
      onConnect: async (invitation: InvitationDescriptor) => {
        connected1.wake(invitation);

        const observable2 = await peer2.acceptInvitation(invitation);
        observable2.subscribe({
          onConnect: async (invitation: InvitationDescriptor) => {
            connected2.wake(invitation);
          },
          onSuccess: () => {
            throw new Error();
          },
          onCancel: () => {
            throw new Error();
          },
          onTimeout: (err) => {
            throw err;
          },
          onError: (err) => {
            throw err;
          }
        });
      },
      onSuccess: () => {
        throw new Error();
      },
      onCancel: () => {
        cancelled.wake();
      },
      onTimeout: (err) => {
        throw err;
      },
      onError: (err) => {
        throw err;
      }
    });

    const invitation1 = await connected1.wait();
    const invitation2 = await connected2.wait();
    expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);

    // TODO(burdon): Simulate network latency.
    setTimeout(() => {
      observable1.cancel();
    });

    await cancelled.wait();
    await space1.close();
  });
});
