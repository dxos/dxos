//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { Invitation, InvitationService } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../service-context';
import { SpaceInvitationServiceImpl } from './space-invitations-services';
import { closeAfterTest, createIdentity, createPeers } from './testing';

// TODO(burdon): TestBuilder.
// TODO(burdon): Test with createLinkedPorts
// TODO(burdon): Error states.
// TODO(burdon): Stream observable API.

describe('services/space-invitation-service', function () {
  it('creates party and invites peer', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service: InvitationService = new SpaceInvitationServiceImpl(peer1.spaceManager, peer1.spaceInvitations);

    const space1 = await peer1.spaceManager.createSpace();
    const invitation: Invitation = {
      spaceKey: space1.key
    };

    const states: Invitation.State[] = [];
    const success = new Trigger<Invitation>();

    {
      const stream: Stream<Invitation> = service.createInvitation(invitation);
      stream.subscribe(
        (invitation: Invitation) => {
          expect(invitation.spaceKey).to.deep.eq(space1.key);
          states.push(invitation.state!);
          console.log('>>', invitation);
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              peer2.acceptInvitation(invitation);
              break;
            }
            case Invitation.State.SUCCESS: {
              success.wake(invitation);
              break;
            }
          }
        },
        (err) => {
          // TODO(burdon): Test error case.
          if (err) {
            log.error(err);
          }
        }
      );
    }

    {
      const invitation = await success.wait();
      expect(invitation.state).to.eq(Invitation.State.SUCCESS);
      expect(states).to.deep.eq([Invitation.State.CONNECTING, Invitation.State.CONNECTED, Invitation.State.SUCCESS]);
    }
  });

  it.only('creates party and cancels invitation', async function () {
    const [peer1, peer2] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(peer1.spaceManager);
    assert(peer1.spaceInvitations);
    const service: InvitationService = new SpaceInvitationServiceImpl(peer1.spaceManager, peer1.spaceInvitations);

    const space1 = await peer1.spaceManager.createSpace();
    const invitation: Invitation = {
      spaceKey: space1.key
    };

    const cancelled = new Trigger<Invitation>();

    {
      const stream: Stream<Invitation> = service.createInvitation(invitation);
      stream.subscribe(
        (invitation: Invitation) => {
          expect(invitation.spaceKey).to.deep.eq(space1.key);
          console.log('>>', invitation);
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              peer2.acceptInvitation(invitation);
              break;
            }
            case Invitation.State.CONNECTED: {
              void service.cancelInvitation(invitation); // TODO(burdon): Uncaught exception.
              break;
            }
            case Invitation.State.SUCCESS: {
              throw new Error('Succeeded before being cancelled');
            }
            case Invitation.State.CANCELLED: {
              cancelled.wake(invitation);
              break;
            }
          }
        },
        (err) => {
          // TODO(burdon): Test error case.
          if (err) {
            log.error(err);
          }
        }
      );
    }

    {
      const invitation = await cancelled.wait();
      expect(invitation.state).to.eq(Invitation.State.CANCELLED);
    }
  });
});
