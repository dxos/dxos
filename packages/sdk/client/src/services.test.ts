//
// Copyright 2020 DXOS.org
//

// @dxos/mocha nodejs

import assert from 'node:assert';

import { latch } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { InvitationRequest, RedeemedInvitation } from '@dxos/protocols/proto/dxos/client';
import { RpcClosedError } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Client } from './packlets/proxies';

const setupClient = async () => {
  const client = new Client();
  await client.initialize();
  afterTest(() => client.destroy());

  return {
    client,
    services: client.services
  };
};

describe.skip('Client Services', function () {
  describe('device invitations', function () {
    it('creates and joins a HALO invitation', async function () {
      const inviter = await setupClient();
      afterTest(() => inviter.client.destroy());
      const invitee = await setupClient();
      afterTest(() => invitee.client.destroy());

      await inviter.services.ProfileService.createProfile({ username: 'test-user' });
      const invitation = await new Promise<InvitationRequest>((resolve, reject) => {
        inviter.services.ProfileService.createInvitation().subscribe(resolve, reject);
      });

      assert(invitation.descriptor);
      const redeemedInvitation = await new Promise<RedeemedInvitation>((resolve, reject) => {
        invitee.services.ProfileService.acceptInvitation(invitation.descriptor!).subscribe(resolve, reject);
      });

      await invitee.services.ProfileService.authenticateInvitation({
        processId: redeemedInvitation.id,
        secret: invitation.descriptor.secret ?? failUndefined()
      });

      const [inviteeProfileLatch, inviteeProfileTrigger] = latch();
      invitee.services.ProfileService.subscribeProfile().subscribe(inviteeProfile => {
        if (inviteeProfile.profile?.username === 'test-user') {
          inviteeProfileTrigger();
        }
      }, err => {
        if (!(err instanceof RpcClosedError)) {
          throw err;
        }
      });
      await inviteeProfileLatch;
    }).timeout(5000);
  });
});
