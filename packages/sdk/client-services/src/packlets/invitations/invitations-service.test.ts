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

describe('services/device-invitation-service', () => {
  test('creates identity and invites peer', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));

    await host.identityManager.createIdentity();
    expect(host.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);

    const service1 = new InvitationsServiceImpl(host.invitations, (invitation) =>
      host.getInvitationHandler(invitation)
    );
    const service2 = new InvitationsServiceImpl(guest.invitations, (invitation) =>
      guest.getInvitationHandler(invitation)
    );

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const proxy1 = new InvitationsProxy(service1, () => ({ kind: Invitation.Kind.DEVICE }));
      const observable1 = proxy1.createInvitation();
      observable1.subscribe(
        (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new InvitationsProxy(service2, () => ({ kind: Invitation.Kind.DEVICE }));
              const observable2 = proxy2.acceptInvitation(invitation);
              observable2.subscribe(
                async (invitation) => {
                  switch (invitation.state) {
                    case Invitation.State.AUTHENTICATING: {
                      await observable2.authenticate(await authenticationCode.wait());
                      break;
                    }

                    case Invitation.State.SUCCESS: {
                      // TODO(burdon): No device.
                      // expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);
                      success2.wake(invitation);
                      break;
                    }
                  }
                },
                (err: Error) => raise(new Error(err.message))
              );
              break;
            }

            case Invitation.State.CONNECTED: {
              assert(invitation.authenticationCode);
              authenticationCode.wake(invitation.authenticationCode);
              break;
            }

            case Invitation.State.SUCCESS: {
              success1.wake(invitation);
              break;
            }
          }
        },
        (err: Error) => raise(new Error(err.message))
      );
    }

    // Check same identity.
    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.identityKey).not.to.exist;
    expect(invitation2.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
    expect(invitation2.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
    expect(invitation2.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(() => {
      expect(host.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
      expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
    });
    // console.log(host.identityManager.identity!.authorizedDeviceKeys.size);
    // console.log(guest.identityManager.identity!.authorizedDeviceKeys.size);
  });
});
