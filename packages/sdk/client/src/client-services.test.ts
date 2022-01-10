//
// Copyright 2020 DXOS.org
//

import { latch, trigger } from '@dxos/async';
import { RpcClosedError } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';
import assert from 'assert';
import { it as test } from 'mocha';
import { Client } from './client';
import { InvitationRequest, RedeemedInvitation } from './proto/gen/dxos/client';

const setup = async () => {
  const client = new Client();
  await client.initialize();
  afterTest(() => client.destroy());

  return {
    client,
    services: client.services,
  }
}

describe('Client Services', () => {
  describe('device invitations', () => {
    test('creates and joins a HALO invitation', async () => {
      const inviter = await setup();
      afterTest(() => inviter.client.destroy());
      const invitee = await setup();
      afterTest(() => invitee.client.destroy());

      await inviter.services.ProfileService.CreateProfile({ username: 'test-user' });


      const invitation = await new Promise<InvitationRequest>((resolve, reject) => {
        inviter.services.ProfileService.CreateInvitation().subscribe(resolve, reject);
      });
      assert(invitation.descriptor)

      const redeemedInvitation = await new Promise<RedeemedInvitation>((resolve, reject) => {
        invitee.services.ProfileService.AcceptInvitation(invitation.descriptor!).subscribe(resolve, reject);
      })

      await invitee.services.ProfileService.AuthenticateInvitation({
        processId: redeemedInvitation.id,
        secret: invitation.descriptor.secret
      });

      const [inviteeProfileLatch, inviteeProfileTrigger] = latch();
      invitee.services.ProfileService.SubscribeProfile().subscribe(inviteeProfile => {
        if (inviteeProfile.profile?.username === 'test-user') {
          inviteeProfileTrigger();
        }
      }, error => {
        if (!(error instanceof RpcClosedError)) {
          throw error;
        }
      });
      await inviteeProfileLatch;
    }).timeout(5000);
  });
});
