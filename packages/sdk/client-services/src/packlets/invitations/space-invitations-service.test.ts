//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';

import { asyncChain, Trigger } from '@dxos/async';
import { SpaceInvitationsProxy } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation, SpaceInvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { ServiceContext } from '../services';
import { createIdentity, createPeers } from '../testing';
import { SpaceInvitationsServiceImpl } from './space-invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe.only('services/space-invitation-service', () => {
  test('creates space and invites peer', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(host.dataSpaceManager);
    assert(host.spaceInvitations);
    const service1: SpaceInvitationsService = new SpaceInvitationsServiceImpl(
      host.identityManager,
      () => host.spaceInvitations!,
      () => host.dataSpaceManager!
    );

    assert(guest.dataSpaceManager);
    assert(guest.spaceInvitations);
    const service2: SpaceInvitationsService = new SpaceInvitationsServiceImpl(
      guest.identityManager,
      () => guest.spaceInvitations!,
      () => guest.dataSpaceManager!
    );

    const space1 = await host.dataSpaceManager.createSpace();

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const proxy1 = new SpaceInvitationsProxy(service1);
      const observable1 = proxy1.createInvitation(space1.key);
      observable1.subscribe(
        (invitation1: Invitation) => {
          switch (invitation1.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new SpaceInvitationsProxy(service2);
              const observable2 = proxy2.acceptInvitation(invitation1);
              observable2.subscribe(
                async (invitation2: Invitation) => {
                  switch (invitation2.state) {
                    case Invitation.State.AUTHENTICATING: {
                      await observable2.authenticate(await authenticationCode.wait());
                      break;
                    }

                    case Invitation.State.SUCCESS: {
                      success2.wake(invitation2);
                      break;
                    }
                  }
                },
                (err) => raise(err)
              );
              break;
            }

            case Invitation.State.CONNECTED: {
              assert(invitation1.authenticationCode);
              authenticationCode.wake(invitation1.authenticationCode);
              break;
            }

            case Invitation.State.SUCCESS: {
              success1.wake(invitation1);
              break;
            }
          }
        },
        (err) => {
          raise(err);
        }
      );
    }

    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.spaceKey).to.deep.eq(invitation2.spaceKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
  });

  test('creates space and cancels invitation', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    assert(host.dataSpaceManager);
    assert(host.spaceInvitations);
    const service1: SpaceInvitationsService = new SpaceInvitationsServiceImpl(
      host.identityManager,
      () => host.spaceInvitations!,
      () => host.dataSpaceManager!
    );

    assert(guest.dataSpaceManager);
    assert(guest.spaceInvitations);
    const service2: SpaceInvitationsService = new SpaceInvitationsServiceImpl(
      guest.identityManager,
      () => guest.spaceInvitations!,
      () => guest.dataSpaceManager!
    );

    const space1 = await host.dataSpaceManager.createSpace();
    const cancelled = new Trigger();

    {
      const proxy = new SpaceInvitationsProxy(service1);
      const observable = proxy.createInvitation(space1.key);
      observable.subscribe(
        (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new SpaceInvitationsProxy(service2);
              proxy2.acceptInvitation(invitation);
              break;
            }
            case Invitation.State.CONNECTED: {
              void observable.cancel();
              break;
            }
            case Invitation.State.CANCELLED: {
              cancelled.wake();
              break;
            }
            case Invitation.State.SUCCESS: {
              raise(new Error());
            }
          }
        },
        (err) => raise(err)
      );
    }

    await cancelled.wait();
  });
});
