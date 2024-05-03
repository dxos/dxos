//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { AlreadyJoinedError } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { type ServiceContext } from '../services';
import { createIdentity, createPeers } from '../testing';
import { performInvitation } from '../testing/invitation-utils';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitations-protocol', () => {
  test('genesis', async () => {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.dataSpaceManager!.createSpace();
    expect(peer.dataSpaceManager!.spaces.has(space.key)).to.be.true;

    await space.close();
  });

  test('genesis & ready', async () => {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.dataSpaceManager!.createSpace();
    expect(peer.dataSpaceManager!.spaces.has(space.key)).to.be.true;

    await peer.dataSpaceManager?.waitUntilSpaceReady(space.key);
    await space.close();
  });

  test('invitation with no auth', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const space1 = await host.dataSpaceManager!.createSpace();
    const spaceKey = space1.key;

    await Promise.all(performInvitation({ host, guest, options: { kind: Invitation.Kind.SPACE, spaceKey } }));

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);

      await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);

      await space1.close();
      await space2.close();
    }
  });

  test('invitation when already joined', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const space1 = await host.dataSpaceManager!.createSpace();
    const spaceKey = space1.key;

    await Promise.all(performInvitation({ host, guest, options: { kind: Invitation.Kind.SPACE, spaceKey } }));

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);
    }

    const [_, guestResult] = performInvitation({
      host,
      guest,
      options: { kind: Invitation.Kind.SPACE, spaceKey },
    });

    expect((await guestResult).error).to.be.instanceOf(AlreadyJoinedError);
  });

  test('creates and accepts invitation with retry', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    let attempt = 0;

    const space1 = await host.dataSpaceManager!.createSpace();

    const [{ invitation: invitation1, error: error1 }, { invitation: invitation2, error: error2 }] = await Promise.all(
      performInvitation({
        host,
        guest,
        options: { kind: Invitation.Kind.SPACE, spaceKey: space1.key },
        hooks: {
          guest: {
            onReady: (invitation) => {
              if (attempt === 0) {
                // Force retry.
                void invitation.authenticate('000000');
                attempt++;
                return true;
              }

              return false;
            },
          },
        },
      }),
    );

    if (error1) {
      throw error1;
    }
    if (error2) {
      throw error2;
    }

    expect(attempt).to.eq(1);
    expect(invitation1?.spaceKey).to.exist;
    expect(invitation2?.spaceKey).to.exist;
    expect(invitation1?.spaceKey).to.deep.eq(invitation2?.spaceKey);

    {
      const space1 = host.dataSpaceManager!.spaces.get(invitation1!.spaceKey!)!;
      const space2 = guest.dataSpaceManager!.spaces.get(invitation2!.spaceKey!)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);

      await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);

      await space1.close();
      await space2.close();
    }

    expect(
      guest.identityManager.identity?.space.spaceState.getCredentialsOfType('dxos.halo.credentials.SpaceMember').length,
    ).to.equal(2); // own halo + newly joined space.
  });

  test('cancels invitation', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const hostConnected = new Trigger<Invitation>();
    const guestConnected = new Trigger<Invitation>();

    const space1 = await host.dataSpaceManager!.createSpace();

    const invitationPromises = performInvitation({
      host,
      guest,
      options: { kind: Invitation.Kind.SPACE, spaceKey: space1.key },
      hooks: {
        host: {
          onConnecting: (invitation) => {
            hostConnected.wake(invitation.get());
          },
          onConnected: (invitation) => {
            void invitation.cancel();
            return true;
          },
          onSuccess: () => raise(new Error('invitation success')),
        },
        guest: {
          onConnecting: (invitation) => {
            guestConnected.wake(invitation.get());
          },
        },
      },
    });

    const { swarmKey: swarmKey1 } = await hostConnected.wait();
    const { swarmKey: swarmKey2 } = await guestConnected.wait();
    expect(swarmKey1).to.deep.eq(swarmKey2);

    const [{ invitation: invitation1 }, { error }] = await Promise.all(invitationPromises);
    expect(invitation1?.state).to.eq(Invitation.State.CANCELLED);
    expect(error).to.exist;

    await space1.close();
  });

  // TODO(burdon): Flaky.
  // test.skip('test multi-use invitation', async () => {
  //   const GUEST_COUNT = 3;
  //   const [host, ...guests] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(
  //     createPeers(GUEST_COUNT + 1)
  //   );

  //   const hostSpace = await host.dataSpaceManager!.createSpace();
  //   const swarmKey = PublicKey.random();
  //   const hostObservable = await host.spaceInvitations!.createInvitation(hostSpace, {
  //     swarmKey,
  //     type: Invitation.Type.MULTIUSE_TESTING
  //   });

  //   const [done, count] = latch({ count: GUEST_COUNT });
  //   hostObservable.subscribe({
  //     onConnecting: async (invitation2: Invitation) => {},
  //     onConnected: async (invitation2: Invitation) => {},
  //     onSuccess: () => {
  //       count();
  //     },
  //     onCancelled: () => {},
  //     onTimeout: (err: Error) => raise(err),
  //     onError: (err: Error) => raise(err)
  //   });

  //   await Promise.all(
  //     range(GUEST_COUNT).map(async (idx) => {
  //       const observable = await guests[idx].spaceInvitations!.acceptInvitation({
  //         swarmKey,
  //         type: Invitation.Type.MULTIUSE_TESTING
  //       });
  //       const success = new Trigger();
  //       observable.subscribe({
  //         onConnecting: async (invitation2: Invitation) => {},
  //         onConnected: async (invitation2: Invitation) => {},
  //         onSuccess: () => {
  //           success.wake();
  //         },
  //         onCancelled: () => raise(new Error()),
  //         onTimeout: (err: Error) => raise(err),
  //         onError: (err: Error) => raise(err)
  //       });
  //       await success.wait({ timeout: 300 });
  //     })
  //   );
  //   await done();

  //   await hostObservable.cancel();
  //   await hostSpace.close();
  // });
});
