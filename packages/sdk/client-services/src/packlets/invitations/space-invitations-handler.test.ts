//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { asyncChain, Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from '../services';
import { createIdentity, createPeers, syncItems } from '../testing';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/space-invitations-handler', function () {
  it('genesis', async function () {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.spaceManager!.createSpace();
    expect(space.database).not.to.be.undefined;
    expect(peer.spaceManager!.spaces.has(space.key)).to.be.true;
    await space.close();
  });

  it('genesis with database mutations', async function () {
    const [peer] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
    const space = await peer.spaceManager!.createSpace();

    {
      const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
      void item.model.set('name', 'test');
    }

    {
      const [item] = space.database!.select({ type: 'test' }).exec().entities;
      expect(item.model.get('name')).to.eq('test');
    }

    await space.close();
  });

  it('creates and accepts invitation', async function () {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const complete1 = new Trigger<PublicKey>();
    const complete2 = new Trigger<PublicKey>();

    const authenticationCode = new Trigger<string>();

    const space1 = await host.spaceManager!.createSpace();
    const observable1 = host.spaceInvitations!.createInvitation(space1);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        const observable2 = guest.spaceInvitations!.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async () => {},
          onConnected: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
          },
          onAuthenticating: async () => {
            await observable2.authenticate(await authenticationCode.wait());
          },
          onSuccess: (invitation: Invitation) => {
            complete2.wake(invitation.spaceKey!);
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
        complete1.wake(invitation.spaceKey!);
      },
      onCancelled: () => raise(new Error()),
      onTimeout: (err: Error) => raise(new Error(err.message)),
      onError: (err: Error) => raise(new Error(err.message))
    });

    {
      const [spaceKey1, spaceKey2] = await Promise.all([complete1.wait(), complete2.wait()]);
      expect(spaceKey1).to.deep.eq(spaceKey2);

      const space1 = host.spaceManager!.spaces.get(spaceKey1)!;
      const space2 = guest.spaceManager!.spaces.get(spaceKey2)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await syncItems(space1, space2);

      await space1.close();
      await space2.close();
    }
  });

  it('cancels invitation', async function () {
    const [host, guest] = await asyncChain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const cancelled = new Trigger();
    const connecting1 = new Trigger<Invitation>(); // peer 1 connected.
    const connecting2 = new Trigger<Invitation>(); // peer 2 connected.

    const space1 = await host.spaceManager!.createSpace();
    const observable1 = await host.spaceInvitations!.createInvitation(space1);
    observable1.subscribe({
      onConnecting: async (invitation1: Invitation) => {
        connecting1.wake(invitation1);

        const observable2 = await guest.spaceInvitations!.acceptInvitation(invitation1);
        observable2.subscribe({
          onConnecting: async (invitation2: Invitation) => {
            expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);
            connecting2.wake(invitation2);
          },
          onConnected: async (invitation2: Invitation) => {},
          onSuccess: () => {},
          onCancelled: () => raise(new Error()),
          onTimeout: (err: Error) => raise(new Error(err.message)),
          onError: (err: Error) => raise(new Error(err.message))
        });
      },
      onConnected: async (invitation1: Invitation) => {},
      onCancelled: () => {
        cancelled.wake();
      },
      onSuccess: () => raise(new Error()),
      onTimeout: (err: Error) => raise(new Error(err.message)),
      onError: (err: Error) => raise(new Error(err.message))
    });

    const invitation1 = await connecting1.wait();
    const invitation2 = await connecting2.wait();
    expect(invitation1.swarmKey).to.eq(invitation2.swarmKey);

    // TODO(burdon): Simulate network latency.
    setTimeout(async () => {
      await observable1.cancel();
    });

    await cancelled.wait();
    await space1.close();
  });
});
