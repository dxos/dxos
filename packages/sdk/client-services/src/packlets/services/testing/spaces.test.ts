//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, TimeoutError, Trigger } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { ObjectModel } from '@dxos/object-model';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { afterTest } from '@dxos/testutils';

import { createServiceContext } from './testing';

describe('services/spaces', function () {
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
  it.only('create and accepts space invitations', async function () {
    const signalContext = new MemorySignalManagerContext();

    const peer1 = await createServiceContext({ signalContext });
    const peer2 = await createServiceContext({ signalContext });

    await peer1.open();
    await peer2.open();
    afterTest(() => peer1.close());
    afterTest(() => peer2.close());

    await peer1.createIdentity();
    await peer2.createIdentity();

    const [invitationComplete, setInvitationComplete] = latch();
    const trigger = new Trigger<Space>();

    // TODO(burdon): Integrate observable with service API.
    // TODO(burdon): Integrate observable with client API.

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
      onTimeout: (err: TimeoutError) => {
        throw new Error('Function not implemented.');
      },
      onError: (err: any) => {
        throw new Error('Function not implemented.');
      },
      onCancel: () => {
        throw new Error('Function not implemented.');
      }
    });

    const space2 = await trigger.wait();
    await invitationComplete();

    // TODO(burdon): Test cancel (with simulated network latency).
    invitation.unsubscribe();

    // TODO(burdon): Factor out and make configurable (multiple items).
    const sync = async () => {
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

    await sync();

    await space1.close();
    await space2.close();
  });
});
