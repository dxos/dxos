//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from '../services';
import { createIdentity, createPeers } from '../testing';
import { SpaceInvitationsProxy } from './space-invitations-proxy';
import { SpaceInvitationsServiceImpl } from './space-invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitation-service', function () {
  it('creates space and invites peer', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service1: InvitationsService = new SpaceInvitationsServiceImpl(
      peer1.identityManager,
      peer1.spaceManager,
      peer1.spaceInvitations
    );

    assert(peer2.spaceManager);
    assert(peer2.spaceInvitations);
    const service2: InvitationsService = new SpaceInvitationsServiceImpl(
      peer2.identityManager,
      peer2.spaceManager,
      peer2.spaceInvitations
    );

    const space1 = await peer1.spaceManager.createSpace();

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    {
      const proxy1 = new SpaceInvitationsProxy(service1);
      const observable1 = proxy1.createInvitation(space1.key);
      observable1.subscribe({
        onConnecting: (invitation: Invitation) => {
          const proxy2 = new SpaceInvitationsProxy(service2);
          const observable2 = proxy2.acceptInvitation(invitation);
          observable2.subscribe({
            onSuccess: (invitation: Invitation) => {
              success2.wake(invitation);
            },
            onError: (err: Error) => raise(new Error(err.message))
          });
        },
        onConnected: (invitation: Invitation) => {},
        onSuccess: (invitation: Invitation) => {
          success1.wake(invitation);
        },
        onCancelled: () => raise(new Error()),
        onTimeout: (err: Error) => raise(new Error(err.message)),
        onError: (err: Error) => raise(new Error(err.message))
      });
    }

    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.spaceKey).to.deep.eq(invitation2.spaceKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);

    // TODO(burdon): Test credentials on both peers?
    // TODO(burdon): Wait for space to by synced.
  });

  it('creates space and cancels invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service1: InvitationsService = new SpaceInvitationsServiceImpl(
      peer1.identityManager,
      peer1.spaceManager,
      peer1.spaceInvitations
    );

    assert(peer2.spaceManager);
    assert(peer2.spaceInvitations);
    const service2: InvitationsService = new SpaceInvitationsServiceImpl(
      peer2.identityManager,
      peer2.spaceManager,
      peer2.spaceInvitations
    );

    const space1 = await peer1.spaceManager.createSpace();
    const cancelled = new Trigger();

    {
      const proxy = new SpaceInvitationsProxy(service1);
      const observable = proxy.createInvitation(space1.key);
      observable.subscribe({
        onConnecting: (invitation: Invitation) => {
          const proxy2 = new SpaceInvitationsProxy(service2);
          proxy2.acceptInvitation(invitation);
        },
        onConnected: (invitation: Invitation) => {
          void observable.cancel();
        },
        onCancelled: () => {
          cancelled.wake();
        },
        onSuccess: () => raise(new Error()),
        onTimeout: (err: Error) => raise(new Error(err.message)),
        onError: (err: Error) => raise(new Error(err.message))
      });
    }

    await cancelled.wait();
  });
});
