//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';

import { asyncChain, latch, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { ServiceContext } from '../services';
import { createIdentity, createPeers, syncItems } from '../testing';
import { performInvitation } from '../testing/invitaiton-utils';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitations-handler', () => {
  test('genesis', async () => {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.dataSpaceManager!.createSpace();
    expect(space.database).not.to.be.undefined;
    expect(peer.dataSpaceManager!.spaces.has(space.key)).to.be.true;
    await space.close();
  });

  test('genesis with database mutations', async () => {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
    const space = await peer.dataSpaceManager!.createSpace();

    {
      const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
      await item.model.set('name', 'test');
    }

    {
      const [item] = space.database!.select({ type: 'test' }).exec().entities;
      expect(item.model.get('name')).to.eq('test');
    }

    await space.close();
  });

  test('invitation with no auth', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const space1 = await host.dataSpaceManager!.createSpace();
    const spaceKey = space1.key;

    await performInvitation(host.spaceInvitations!, guest.spaceInvitations!, space1);

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await syncItems(space1, space2);

      await space1.close();
      await space2.close();
    }
  });

  test('creates and accepts invitation with retry', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const complete1 = new Trigger<PublicKey>();
    const complete2 = new Trigger<PublicKey>();

    let attempt = 0;
    const authenticationCode = new Trigger<string>();

    const space1 = await host.dataSpaceManager!.createSpace();
    const observable1 = host.spaceInvitations!.createInvitation(space1);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        const observable2 = guest.spaceInvitations!.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async () => {},
          onConnected: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
          },
          onAuthenticating: async () => {
            if (attempt++ === 0) {
              // Force retry.
              await observable2.authenticate('000000');
            } else {
              await observable2.authenticate(await authenticationCode.wait());
            }
          },
          onSuccess: (invitation: Invitation) => {
            complete2.wake(invitation.spaceKey!);
          },
          onCancelled: () => raise(new Error()),
          onTimeout: (err: Error) => raise(err),
          onError: (err: Error) => raise(err)
        });
      },
      onConnected: (invitation: Invitation) => {
        assert(invitation.authenticationCode);
        authenticationCode.wake(invitation.authenticationCode);
      },
      onSuccess: (invitation: Invitation) => {
        complete1.wake(invitation.spaceKey!);
      },
      onCancelled: () => raise(new Error()),
      onTimeout: (err: Error) => raise(err),
      onError: (err: Error) => raise(err)
    });

    const [spaceKey1, spaceKey2] = await Promise.all([complete1.wait(), complete2.wait()]);
    expect(spaceKey1).to.deep.eq(spaceKey2);

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey1)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey2)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await syncItems(space1, space2);

      await space1.close();
      await space2.close();
    }

    expect(
      guest.identityManager.identity?.space.spaceState.getCredentialsOfType('dxos.halo.credentials.SpaceMember').length
    ).to.equal(2); // own halo + newly joined space.
  });

  test('cancels invitation', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const cancelled = new Trigger();
    const connecting1 = new Trigger<Invitation>(); // peer 1 connected.
    const connecting2 = new Trigger<Invitation>(); // peer 2 connected.

    const space1 = await host.dataSpaceManager!.createSpace();
    const observable1 = await host.spaceInvitations!.createInvitation(space1);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        connecting1.wake(invitation1);

        const observable2 = await guest.spaceInvitations!.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
            connecting2.wake(invitation2);
          },
          onConnected: async (invitation2: Invitation) => {},
          onSuccess: () => {},
          onCancelled: () => raise(new Error()),
          onTimeout: (err: Error) => raise(err),
          onError: (err: Error) => raise(err)
        });
      },
      onConnected: async (invitation1: Invitation) => {},
      onCancelled: () => {
        cancelled.wake();
      },
      onSuccess: () => raise(new Error()),
      onTimeout: (err: Error) => raise(err),
      onError: (err: Error) => raise(err)
    });

    const invitation1 = await connecting1.wait();
    const invitation2 = await connecting2.wait();
    expect(invitation1.swarmKey).to.eq(invitation2.swarmKey); // TODO(burdon): Normalize to use to.deep.eq.

    // TODO(burdon): Simulate network latency.
    setTimeout(async () => {
      await observable1.cancel();
    });

    await cancelled.wait();
    await space1.close();
  });

  // TODO(burdon): Flaky.
  test.skip('test multi-use invitation', async () => {
    const GUEST_COUNT = 3;
    const [host, ...guests] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(
      createPeers(GUEST_COUNT + 1)
    );

    const hostSpace = await host.dataSpaceManager!.createSpace();
    const swarmKey = PublicKey.random();
    const hostObservable = await host.spaceInvitations!.createInvitation(hostSpace, {
      swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING
    });

    const [done, count] = latch({ count: GUEST_COUNT });
    hostObservable.subscribe({
      onConnecting: async (invitation2: Invitation) => {},
      onConnected: async (invitation2: Invitation) => {},
      onSuccess: () => {
        count();
      },
      onCancelled: () => {},
      onTimeout: (err: Error) => raise(err),
      onError: (err: Error) => raise(err)
    });

    await Promise.all(
      range(GUEST_COUNT).map(async (idx) => {
        const observable = await guests[idx].spaceInvitations!.acceptInvitation({
          swarmKey,
          type: Invitation.Type.MULTIUSE_TESTING
        });
        const success = new Trigger();
        observable.subscribe({
          onConnecting: async (invitation2: Invitation) => {},
          onConnected: async (invitation2: Invitation) => {},
          onSuccess: () => {
            success.wake();
          },
          onCancelled: () => raise(new Error()),
          onTimeout: (err: Error) => raise(err),
          onError: (err: Error) => raise(err)
        });
        await success.wait({ timeout: 300 });
      })
    );
    await done();

    await hostObservable.cancel();
    await hostSpace.close();
  });
});
