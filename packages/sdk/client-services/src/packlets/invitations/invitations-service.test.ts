//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { asyncChain, Trigger } from '@dxos/async';
import { InvitationsProxy } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { ServiceContext } from '../services';
import { DataSpace } from '../spaces';
import { createIdentity, createPeers, performInvitation } from '../testing';
import { InvitationsServiceImpl } from './invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitation-service', () => {
  let host: InvitationsProxy;
  let guest: InvitationsProxy;
  let space: DataSpace;

  beforeEach(async () => {
    const [hostContext, guestContext] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(
      createPeers(2)
    );
    assert(hostContext.dataSpaceManager);
    assert(guestContext.dataSpaceManager);

    const hostService = new InvitationsServiceImpl(hostContext.invitations, (invitation) =>
      hostContext.getInvitationHandler(invitation)
    );

    const guestService = new InvitationsServiceImpl(guestContext.invitations, (invitation) =>
      guestContext.getInvitationHandler(invitation)
    );

    space = await hostContext.dataSpaceManager.createSpace();
    host = new InvitationsProxy(hostService, () => ({ kind: Invitation.Kind.SPACE, spaceKey: space.key }));
    guest = new InvitationsProxy(guestService, () => ({ kind: Invitation.Kind.SPACE }));

    afterTest(() => space.close());
  });

  test('creates space and invites peer', async () => {
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await performInvitation({
      host,
      guest,
      options: { authMethod: Invitation.AuthMethod.SHARED_SECRET }
    });

    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(guestInvitation?.spaceKey).to.deep.eq(space.key);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
  });

  test('creates space and cancels invitation', async () => {
    const hostConnected = new Trigger<Invitation>();
    const guestConnected = new Trigger<Invitation>();

    const invitationPromise = performInvitation({
      host,
      guest,
      hooks: {
        host: {
          onConnecting: (invitation) => {
            hostConnected.wake(invitation.get());
          },
          onConnected: (invitation) => {
            void invitation.cancel();
            return true;
          },
          onSuccess: () => raise(new Error('invitation success'))
        },
        guest: {
          onConnecting: (invitation) => {
            guestConnected.wake(invitation.get());
          }
        }
      }
    });

    const { swarmKey: swarmKey1 } = await hostConnected.wait();
    const { swarmKey: swarmKey2 } = await guestConnected.wait();
    expect(swarmKey1).to.deep.eq(swarmKey2);

    const [{ invitation: invitation1 }, { error }] = await invitationPromise;
    expect(invitation1?.state).to.eq(Invitation.State.CANCELLED);
    expect(error).to.exist;
  });
});

describe('services/device-invitation-service', () => {
  let hostContext: ServiceContext;
  let guestContext: ServiceContext;
  let host: InvitationsProxy;
  let guest: InvitationsProxy;

  beforeEach(async () => {
    const peers = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));
    hostContext = peers[0];
    guestContext = peers[1];

    await hostContext.identityManager.createIdentity();
    expect(hostContext.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);

    const hostService = new InvitationsServiceImpl(hostContext.invitations, (invitation) =>
      hostContext.getInvitationHandler(invitation)
    );

    const guestService = new InvitationsServiceImpl(guestContext.invitations, (invitation) =>
      guestContext.getInvitationHandler(invitation)
    );

    host = new InvitationsProxy(hostService, () => ({ kind: Invitation.Kind.DEVICE }));
    guest = new InvitationsProxy(guestService, () => ({ kind: Invitation.Kind.DEVICE }));
  });

  test('creates identity and invites peer', async () => {
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await performInvitation({
      host,
      guest,
      options: { authMethod: Invitation.AuthMethod.SHARED_SECRET }
    });

    // Check same identity.
    expect(hostInvitation!.identityKey).not.to.exist;
    expect(guestInvitation?.identityKey).to.deep.eq(hostContext.identityManager.identity!.identityKey);
    expect(guestInvitation?.identityKey).to.deep.eq(guestContext.identityManager.identity!.identityKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
    expect(guestInvitation?.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(() => {
      expect(hostContext.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
      expect(guestContext.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
    });
    // console.log(host.identityManager.identity!.authorizedDeviceKeys.size);
    // console.log(guest.identityManager.identity!.authorizedDeviceKeys.size);
  });
});
