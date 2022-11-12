//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { Invitation, HaloInvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from '../services';
import { createPeers } from '../testing';
import { HaloInvitationsProxy } from './halo-invitations-proxy';
import { HaloInvitationsServiceImpl } from './halo-invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/halo-invitation-service', function () {
  it('creates identity and invites peer', async function () {
    const [host, guest] = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));

    await host.identityManager.createIdentity();

    // prettier-ignore
    const service1: HaloInvitationsService = new HaloInvitationsServiceImpl(
      host.identityManager,
      host.haloInvitations
    );
    // prettier-ignore
    const service2: HaloInvitationsService = new HaloInvitationsServiceImpl(
      guest.identityManager,
      guest.haloInvitations
    );

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const proxy1 = new HaloInvitationsProxy(service1);
      const observable1 = proxy1.createInvitation();
      observable1.subscribe({
        onConnecting: (invitation: Invitation) => {
          const proxy2 = new HaloInvitationsProxy(service2);
          const observable2 = proxy2.acceptInvitation(invitation);
          observable2.subscribe({
            onAuthenticating: async () => {
              await observable2.authenticate(await authenticationCode.wait());
            },
            onSuccess: (invitation: Invitation) => {
              success2.wake(invitation);
            },
            onError: (err: Error) => raise(new Error(err.message))
          });
        },
        onConnected: (invitation: Invitation) => {
          assert(invitation.authenticationCode);
          authenticationCode.wake(invitation.authenticationCode);
        },
        onSuccess: (invitation: Invitation) => {
          success1.wake(invitation);
        },
        onCancelled: () => raise(new Error()),
        onTimeout: (err: Error) => raise(new Error(err.message)),
        onError: (err: Error) => raise(new Error(err.message))
      });
    }

    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.identityKey).not.to.exist;
    expect(invitation2.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
    expect(invitation2.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
    expect(invitation2.state).to.eq(Invitation.State.SUCCESS);
  });
});
