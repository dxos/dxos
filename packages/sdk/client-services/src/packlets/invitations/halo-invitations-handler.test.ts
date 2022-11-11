//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from '../services';
import { createPeers, createServiceContext } from '../testing';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/halo', function () {
  it('creates identity', async function () {
    const peer = createServiceContext();
    await peer.open();
    afterTest(() => peer.close());

    const identity = await peer.createIdentity();
    expect(identity).not.to.be.undefined;
  });

  it.only('creates and accepts invitation', async function () {
    const [host, guest] = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));

    const identity1 = await host.createIdentity();
    expect(host.identityManager.identity).to.eq(identity1);

    // TODO(burdon): Put context in options.
    const observable1 = await host.haloInvitations.createInvitation();

    const complete1 = new Trigger<PublicKey>();
    const complete2 = new Trigger<PublicKey>();

    const authenticationCode = new Trigger<string>();

    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        const observable2 = guest.haloInvitations!.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async () => {},
          onConnected: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
          },
          onAuthenticating: async () => {
            await observable2.authenticate(await authenticationCode.wait());
          },
          onSuccess: (invitation: Invitation) => {
            complete2.wake(invitation.identityKey!);
          },
          onCancelled: () => raise(new Error()),
          onTimeout: (err: Error) => raise(new Error(err.message)),
          onError: (err: Error) => raise(new Error(err.message))
        });
      },
      onConnected: (invitation: Invitation) => {
        assert(invitation.authenticationCode);
        authenticationCode.wake(invitation.authenticationCode);
      },
      onSuccess: (invitation: Invitation) => {
        complete1.wake(host.identityManager.identity!.identityKey);
      },
      onCancelled: () => raise(new Error()),
      onTimeout: (err: Error) => raise(new Error(err.message)),
      onError: (err: Error) => raise(new Error(err.message))
    });

    const [identityKey1, identityKey2] = await Promise.all([complete1.wait(), complete2.wait()]);
    expect(identityKey1).to.deep.eq(identityKey2);
  });
});
