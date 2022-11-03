//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { Space } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../service-context';
import { closeAfterTest, createIdentity, createPeers, syncItems } from '../testing';

describe('services/spaces', function () {
  it('genesis', async function () {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.spaceManager!.createSpace();
    expect(space.database).not.to.be.undefined;
    expect(peer.spaceManager!.spaces.has(space.key)).to.be.true;
    await space.close();
  });

  it('genesis with database mutations', async function () {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
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
  // TODO(burdon): Uncaught error if run both tests in browser (Error Closed: Request._openAndNotClosed).
  it('creates and accepts invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const complete1 = new Trigger<Space>();
    const complete2 = new Trigger<Space>();

    const space1 = await peer1.spaceManager!.createSpace();
    const observable1 = peer1.createInvitation(space1.key);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        const observable2 = peer2.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async (invitation2: Invitation) => {},
          onConnected: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
          },
          onSuccess: (space2: Space) => {
            complete2.wake(space2);
          },
          onCancel: () => {
            throw new Error();
          },
          onTimeout: (err: any) => {
            throw err;
          },
          onError: (err: any) => {
            throw err;
          }
        });
      },
      onConnected: (invitation: Invitation) => {},
      onSuccess: (invitation: Invitation) => {
        complete1.wake(space1);
      },
      onCancel: () => {
        // TODO(burdon): Change observable API to throw error by default?
        throw new Error();
      },
      onTimeout: (err: any) => {
        throw err;
      },
      onError: (err: any) => {
        throw err;
      }
    });

    {
      const [space1, space2] = await Promise.all([complete1.wait(), complete2.wait()]);
      expect(space1.key).to.deep.eq(space2.key);

      await syncItems(space1, space2);

      await space1.close();
      await space2.close();
    }
  });

  // TODO(burdon): Factor out common test with above.
  it('cancels invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const cancelled = new Trigger();
    const connecting1 = new Trigger<Invitation>(); // peer 1 connected.
    const connecting2 = new Trigger<Invitation>(); // peer 2 connected.

    const space1 = await peer1.spaceManager!.createSpace();
    const observable1 = await peer1.createInvitation(space1.key);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        connecting1.wake(invitation1);

        const observable2 = await peer2.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
            connecting2.wake(invitation2);
          },
          onConnected: async (invitation2: Invitation) => {
            // TODO(burdon): Maybe connects?
          },
          onSuccess: () => {
            throw new Error();
          },
          onCancel: () => {
            throw new Error();
          },
          onTimeout: (err: any) => {
            throw err;
          },
          onError: (err: any) => {
            throw err;
          }
        });
      },
      onConnected: async (invitation1: Invitation) => {
        // TODO(burdon): Maybe connects?
      },
      onSuccess: () => {
        throw new Error();
      },
      onCancel: () => {
        cancelled.wake();
      },
      onTimeout: (err: any) => {
        throw err;
      },
      onError: (err: any) => {
        throw err;
      }
    });

    const invitation1 = await connecting1.wait();
    const invitation2 = await connecting2.wait();
    expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);

    // TODO(burdon): Simulate network latency.
    setTimeout(async () => {
      await observable1.cancel();
    });

    await cancelled.wait();
    await space1.close();
  });
});
