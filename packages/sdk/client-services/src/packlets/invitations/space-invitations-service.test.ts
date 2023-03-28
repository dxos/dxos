//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';

import { asyncChain, Trigger } from '@dxos/async';
import { InvitationsProxy } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { ServiceContext } from '../services';
import { createIdentity, createPeers } from '../testing';
import { InvitationsServiceImpl } from './invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitation-service', () => {
  test('creates space and invites peer', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
    assert(host.dataSpaceManager);
    assert(guest.dataSpaceManager);

    const service1 = new InvitationsServiceImpl(host.invitations, (invitation) =>
      host.getInvitationHandler(invitation)
    );

    const service2 = new InvitationsServiceImpl(guest.invitations, (invitation) =>
      guest.getInvitationHandler(invitation)
    );

    const space1 = await host.dataSpaceManager.createSpace();

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const proxy1 = new InvitationsProxy(service1, () => ({ kind: Invitation.Kind.SPACE, spaceKey: space1.key }));
      const observable1 = proxy1.createInvitation();
      observable1.subscribe(
        (invitation1: Invitation) => {
          switch (invitation1.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new InvitationsProxy(service2, () => ({ kind: Invitation.Kind.SPACE }));
              const observable2 = proxy2.acceptInvitation({ ...invitation1, spaceKey: undefined });
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
                (err: any) => raise(err)
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
        (err: any) => {
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
    assert(guest.dataSpaceManager);

    const service1 = new InvitationsServiceImpl(host.invitations, (invitation) =>
      host.getInvitationHandler(invitation)
    );

    const service2 = new InvitationsServiceImpl(guest.invitations, (invitation) =>
      guest.getInvitationHandler(invitation)
    );

    const space1 = await host.dataSpaceManager.createSpace();
    const cancelled = new Trigger();

    {
      const proxy1 = new InvitationsProxy(service1, () => ({ kind: Invitation.Kind.SPACE, spaceKey: space1.key }));
      const observable = proxy1.createInvitation();
      observable.subscribe(
        (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new InvitationsProxy(service2, () => ({ kind: Invitation.Kind.SPACE }));
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
        (err: any) => raise(err)
      );
    }

    await cancelled.wait();
  });
});
