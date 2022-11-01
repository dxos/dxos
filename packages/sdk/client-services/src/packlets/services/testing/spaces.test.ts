//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncChain, latch, TimeoutError, Trigger } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { ObjectModel } from '@dxos/object-model';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { afterTest } from '@dxos/testutils';
import { ServiceContext } from 'packages/sdk/client-services/src/packlets/services/service-context';

import { createServiceContext } from './testing';

// TODO(burdon): Factor out and make configurable (multiple items).
const sync = async (space1: Space, space2: Space) => {
  {
    // Check item replicated from 1 => 2.
    const item1 = await space1.database!.createItem({ type: 'dxos.example.1' });
    const item2 = await space2.database!.waitForItem({ type: 'dxos.example.1' });
    expect(item1.id).to.eq(item2.id);
  }

  {
    // Check item replicated from 2 => 1.
    const item1 = await space2.database!.createItem({ type: 'dxos.example.2' });
    const item2 = await space1.database!.waitForItem({ type: 'dxos.example.2' });
    expect(item1.id).to.eq(item2.id);
  }
};

describe('services/spaces', function () {
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

  it('space genesis', async function () {
    const peer = await createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    await peer.createIdentity();

    const space = await peer.spaceManager!.createSpace();
    expect(space.database).not.to.be.undefined;
    expect(peer.spaceManager!.spaces.has(space.key)).to.be.true;
    await space.close();
  });

  it('space genesis with database', async function () {
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

  // TODO(burdon): Only!!!
  // TODO(burdon): Integrate observable with service API.
  // TODO(burdon): Integrate observable with client API.
  // TODO(burdon): Replicate test with cancellation (with simulated network latency).
  it.only('create and accepts space invitations', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const [invitationComplete, setInvitationComplete] = latch();
    const trigger = new Trigger<Space>();

    const space1 = await peer1.spaceManager!.createSpace();
    const invitation = await peer1.createInvitation(space1.key);
    invitation.subscribe({
      onConnect: async (invitation: InvitationDescriptor) => {
        const space2 = await peer2.acceptInvitation(invitation);
        expect(space1.key).to.deep.eq(space2.key);
        trigger.wake(space2);
      },
      onSuccess: () => {
        setInvitationComplete();
      },
      onCancel: () => {
        throw new Error();
      },
      onTimeout: (err: TimeoutError) => {
        throw new Error();
      },
      onError: (err: any) => {
        throw new Error();
      }
    });

    const space2 = await trigger.wait();
    await invitationComplete();
    invitation.unsubscribe();

    await sync(space1, space2);

    await space1.close();
    await space2.close();
  });
});
