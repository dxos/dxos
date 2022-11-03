//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../service-context';
import { closeAfterTest, createIdentity, createPeers } from '../testing';
import { SpaceInvitationProxy } from './space-invitations-proxy';
import { SpaceInvitationServiceImpl } from './space-invitations-service';

const fail = () => {
  throw new Error();
};

describe.only('services/space-invitation-service', function () {
  it('creates party and invites peer', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service: InvitationService = new SpaceInvitationServiceImpl(peer1.spaceManager, peer1.spaceInvitations);
    const space1 = await peer1.spaceManager.createSpace();

    const success = new Trigger<Invitation>();

    {
      const proxy = new SpaceInvitationProxy(service);
      const observable = proxy.createInvitation(space1.key);
      observable.subscribe({
        onConnecting: (invitation: Invitation) => {
          peer2.acceptInvitation(invitation);
        },
        onConnected: (invitation: Invitation) => {},
        onSuccess: (invitation: Invitation) => {
          success.wake(invitation);
        },
        onCancelled: fail,
        onTimeout: fail,
        onError: fail
      });
    }

    const invitation = await success.wait();
    expect(invitation.state).to.eq(Invitation.State.SUCCESS);
  });

  // TODO(burdon): Use proxy in test above.
  it.only('creates party and cancels invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service: InvitationService = new SpaceInvitationServiceImpl(peer1.spaceManager, peer1.spaceInvitations);
    const space1 = await peer1.spaceManager.createSpace();

    const cancelled = new Trigger();

    {
      const proxy = new SpaceInvitationProxy(service);
      const observable = proxy.createInvitation(space1.key);
      observable.subscribe({
        onConnecting: (invitation: Invitation) => {
          peer2.acceptInvitation(invitation);
        },
        onConnected: (invitation: Invitation) => {
          void observable.cancel();
        },
        onCancelled: () => {
          cancelled.wake();
        },
        onSuccess: fail,
        onTimeout: fail,
        onError: fail
      });
    }

    await cancelled.wait();
  });
});
